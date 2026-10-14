"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseM3u = parseM3u;
const fallbackLogoUrl = '/images/channel-placeholder.svg';
function readAttributes(line) {
    const attributes = {};
    const attributePattern = /([\w-]+)="([^"]*)"/g;
    for (const match of line.matchAll(attributePattern)) {
        attributes[match[1]] = match[2];
    }
    return attributes;
}
function readChannelInfo(line) {
    // The final comma separates M3U attributes from the visible channel name.
    const nameSeparator = line.lastIndexOf(',');
    if (nameSeparator === -1)
        return undefined;
    const attributes = readAttributes(line);
    const name = line.slice(nameSeparator + 1).trim();
    const categoryText = attributes['group-title'] ?? '';
    const categories = categoryText ? categoryText.split(';').map((category) => category.trim()).filter(Boolean) : [];
    if (!name)
        return undefined;
    return {
        name,
        logoUrl: attributes['tvg-logo'] || fallbackLogoUrl,
        categories,
        // We trust this explicit label from the playlist without making network requests.
        isActive: !name.includes('[Geo-blocked]'),
        tvgId: attributes['tvg-id'] || undefined,
        httpReferrer: attributes['http-referrer'] || undefined,
        httpUserAgent: attributes['http-user-agent'] || undefined
    };
}
function isStreamUrl(line) {
    return line.startsWith('http://') || line.startsWith('https://');
}
function readStreamType(streamUrl) {
    const path = streamUrl.split('?')[0].toLowerCase();
    if (path.endsWith('.m3u8'))
        return 'hls';
    if (path.endsWith('.mpd'))
        return 'dash';
    return undefined;
}
function readOption(line, optionName) {
    const prefix = `#EXTVLCOPT:${optionName}=`;
    return line.startsWith(prefix) ? line.slice(prefix.length).trim() || undefined : undefined;
}
// Reads the common #EXTINF + URL M3U format used by the local playlists.
function parseM3u(playlist, country) {
    const cleanCountry = country.trim();
    if (!cleanCountry)
        throw new Error('Country is required to import a playlist');
    const channels = [];
    let pendingChannel;
    for (const rawLine of playlist.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line.startsWith('#EXTINF:')) {
            pendingChannel = readChannelInfo(line);
            continue;
        }
        if (pendingChannel) {
            pendingChannel.httpReferrer ??= readOption(line, 'http-referrer');
            pendingChannel.httpUserAgent ??= readOption(line, 'http-user-agent');
        }
        if (!isStreamUrl(line))
            continue;
        if (pendingChannel) {
            channels.push({
                ...pendingChannel,
                streamUrl: line,
                streamType: readStreamType(line),
                country: cleanCountry
            });
        }
        pendingChannel = undefined;
    }
    return channels;
}

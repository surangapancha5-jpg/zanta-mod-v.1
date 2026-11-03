// Emoji detection and animation helper for iOS system-style emojis

// Regex to detect if text consists only of 1 to 3 emojis without alphanumeric characters
const ONLY_EMOJI_REGEX = /^(?:[\u{1F300}-\u{1F9FF}]|[\u{1FA00}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|\u{200D}|❤️|😂|🔥|👍|👏|🎉|🚀|😍|🥰|😘|😭|😮|🥺|✨|💯|🙏){1,4}$/u;

export function isSingleOrFewEmojis(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  // Remove whitespace
  const noSpace = trimmed.replace(/\s+/g, '');
  if (!noSpace) return false;
  return ONLY_EMOJI_REGEX.test(noSpace);
}

export function getEmojiAnimationClass(text: string): string {
  const trimmed = text.trim();
  if (trimmed === '❤️' || trimmed === '💖' || trimmed === '💘' || trimmed === '💓' || trimmed === '💕') {
    return 'anim-emoji-heart text-6xl my-1';
  }
  if (trimmed === '😂' || trimmed === '🤣') {
    return 'anim-emoji-laugh text-6xl my-1';
  }
  if (trimmed === '🔥') {
    return 'anim-emoji-fire text-6xl my-1';
  }
  if (trimmed === '👍' || trimmed === '👏' || trimmed === '🎉' || trimmed === '🚀') {
    return 'anim-emoji-bounce text-6xl my-1';
  }
  return 'anim-emoji-bounce text-5xl my-1';
}

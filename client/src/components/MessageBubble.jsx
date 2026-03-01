import BadgeName from './BadgeName';

const customEmojiRegex = /:([a-zA-Z0-9_]+):/g;

export default function MessageBubble({ msg }) {
  const emojiMap = Object.fromEntries((msg.reactions || []).filter((r) => r.customEmoji).map((r) => [r.customEmoji.shortcode, r.customEmoji.imageUrl]));
  const parts = [];
  let last = 0;
  let m;
  while ((m = customEmojiRegex.exec(msg.text || ''))) {
    if (m.index > last) parts.push(msg.text.slice(last, m.index));
    const shortcode = m[1];
    if (emojiMap[shortcode]) parts.push(<img key={`${msg.id}-${shortcode}-${m.index}`} className="inline w-5 h-5" src={`http://localhost:4000${emojiMap[shortcode]}`} alt={shortcode} />);
    else parts.push(`:${shortcode}:`);
    last = m.index + m[0].length;
  }
  if (msg.text && last < msg.text.length) parts.push(msg.text.slice(last));

  return (
    <div className="glass rounded-2xl p-3 mb-2">
      <div className="text-xs text-violet-200"><BadgeName user={msg.sender} /></div>
      <div>{parts.length ? parts : msg.text}</div>
      {msg.isPinned && <div className="text-[10px] text-amber-200">📌 pinned</div>}
    </div>
  );
}

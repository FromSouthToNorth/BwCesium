export function stringEndNumber(topic) {
  if (!topic) return;
  const { length } = topic;
  const result = [];
  for (let i = length - 1; i >= 0; i--) {
    const ascii = topic.charCodeAt(i);
    if (ascii >= 48 && ascii <= 57) {
      result.push(topic.charAt(i));
    } else {
      return result.reverse()
        .join('');
    }
  }
  return result.reverse()
    .join('');
}

/** 从 Work 的自然语言指令中提取靶点名称。 */
export function extractWorkTarget(instruction: string): string | null {
  const text = instruction.trim();
  const targetToken = '([\\u4e00-\\u9fa5A-Za-z0-9][\\u4e00-\\u9fa5A-Za-z0-9._-]{1,31})';
  const ExplicitTarget = text.match(/(?:^|[\s，,])target\s*[:：]\s*([A-Za-z0-9][A-Za-z0-9._-]{1,31})/i);
  if (ExplicitTarget?.[1]) return ExplicitTarget[1];
  const ChineseTarget = text.match(/(?:^|[，,。；;\s])(?:针对|靶向|亲和|作用于)\s*([\u4e00-\u9fa5A-Za-z0-9._-]+?)(?=设计|开发|筛选|生成|，|,|。|$)/);
  if (ChineseTarget?.[1]) return ChineseTarget[1];
  const patterns = [
    new RegExp(`(?:针对|靶向|亲和|作用于|目标(?:为|是|:|：)?|target(?:ing)?(?:\\s+(?:to|is))?)\\s*${targetToken}`, 'i'),
    new RegExp(`(?:为|给)\\s*${targetToken}\\s*(?:设计|开发|筛选|生成)`, 'i'),
    new RegExp(`^${targetToken}(?:[，,:：\\s]|$)`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

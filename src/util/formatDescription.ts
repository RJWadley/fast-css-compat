export const formatDescription = (description: string) =>
  description.replace(/<code>(.*?)<\/code>/g, "$1");

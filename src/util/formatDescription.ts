export const formatDescription = (description: string | undefined) =>
  description?.replace(/<code>(.*?)<\/code>/g, "$1");

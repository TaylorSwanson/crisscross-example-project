// Template for generating a response
// Doesn't include header/type

export default function(err: string | null, message?: object): string {
  if (err) {
    return JSON.stringify({
      success: 0,
      message: err
    });
  }

  return JSON.stringify({
    success: 1,
    ...message
  });
};

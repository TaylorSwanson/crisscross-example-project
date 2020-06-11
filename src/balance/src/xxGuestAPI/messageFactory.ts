// Template for generating a response

export default function messageFactory(err: string | null, message?: object): string {
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

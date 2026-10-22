// Gives the handler an AbortSignal that fires if the client disconnects
// (closed tab, Cancel or Stop button), so we stop paying for AI calls
// nobody will read.
export function abortOnClose(req, res, next) {
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });
  req.abortSignal = controller.signal;
  next();
}

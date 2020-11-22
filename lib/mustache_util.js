import mustache from "mustache";

// Returns the name of a function followed by the arguments.
export function getQueryCall(token) {
  const match = token.match(/([^(]+)\(([^)]*)\)/);
  if (!match || !match[1] || !match[2]) return;
  const query = match[1];

  let args;
  let error;
  let json = `[${match[2]}]`;

  try {
    args = JSON.parse(json);
  } catch (e) {
    error = `Error parsing arguments. Ensure args form valid JSON: ${json}`;
  }

  return { token, query, args, error };
}

// Traverse the mustache template looking for all the query calls.
// Returns the list of query calls.
export function findQueryCalls(mustacheTpl) {
  const result = [];
  function traverse(tokens) {
    for (let token of tokens) {
      if (token[0] === "name") {
        const queryCall = getQueryCall(token[1]);
        if (queryCall) result.push(queryCall);
      }
      if (Array.isArray(token[4])) traverse(token[4]);
    }
  }
  traverse(mustache.parse(mustacheTpl));
  return result;
}

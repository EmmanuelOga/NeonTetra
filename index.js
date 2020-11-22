import mustache from "mustache";

import { createSchema } from "./lib/db_schema.js";
import { createClient, createDatabase, WQ } from "./lib/db_setup.js";
import { findQueryCalls } from "./lib/mustache_util.js";

async function findQuery(client, queryId) {
  const result = await WQ.limit(1)
    .select("v:body")
    .and(
      WQ.triple(queryId, "type", "scm:Query"),
      WQ.triple(queryId, "scm:Query.body", "v:body")
    )
    .execute(client)
    .catch(console.log);

  if (result && result.bindings && result.bindings[0]) {
    return result.bindings[0].body["@value"];
  }
}

async function renderTopic(client, docId) {
  const result = await WQ.limit(1)
    .select("v:body")
    .and(
      WQ.triple(docId, "type", "scm:Topic"),
      WQ.triple(docId, "scm:Topic.body", "v:body")
    )
    .execute(client)
    .catch(console.log);

  if (!result.bindings.length) {
    console.log(`Couldn't find topic ${docId}`);
    return;
  }

  const body = result.bindings[0].body["@value"];

  const view = {};

  for (let { token, query, args, error } of findQueryCalls(body)) {
    if (error) {
      console.log(error);
    } else {
      const code = await findQuery(client, `doc:query.${query}`);
      const fun = eval(`(${code})`);
      const { defaultField, output } = await fun(client, ...(args || []));
      view[token] = output[defaultField];
    }
  }

  const output = mustache.render(body, view);
  console.log("INPUT");
  console.log(body);
  console.log();
  console.log("OUTPUT");
  console.log(output);
}

async function run() {
  const client = createClient();

  await client.connect().catch(console.log);

  await createDatabase(client, true);
  await createSchema(client);

  await WQ.insert("me", "Person")
    .property("Person.firstName", "Emmanuel")
    .property("Person.lastName", "Oga")
    .execute(client, "First doc!")
    .catch(console.log);

  await WQ.insert("wq1", "Topic")
    .property("Topic.body", `<div>A very cool document from {{person("doc:me")}}.</div>`)
    .execute(client, "A document with a query.")
    .catch(console.log);

  await renderTopic(client, "wq1").catch(console.log);
}

run().then(() => {
  console.log("Done.");
});

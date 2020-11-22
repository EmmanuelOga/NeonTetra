import { WQ } from "./db_setup.js";

export async function createTopic(client) {
  const schema = WQ.when(true).and(
    WQ.doctype("Topic")
      .label("Rainbowfish Topic")
      .description("A single snippet of content.")
      .property("Topic.author", "string")
      .label("Topic author")
      .property("Topic.title", "string")
      .label("Topic title")
      .property("Topic.description", "string")
      .label("Topic description")
      .property("Topic.header", "string")
      .label("Topic header")
      .property("Topic.body", "string")
      .label("Topic body")
      .property("Topic.footer", "string")
      .label("Topic footer")
  );

  return schema.execute(client).catch(console.log);
}

export async function createPerson(client) {
  const schema = WQ.when(true).and(
    WQ.doctype("Person")
      .label("A Person")
      .description("A single snippet of content.")
      .property("Person.firstName", "string")
      .label("Person first name")
      .property("Person.lastName", "string")
      .label("Person last name")
  );

  return schema.execute(client).catch(console.log);
}

export async function createQuery(client) {
  const schema = WQ.when(true).and(
    WQ.doctype("Query")
      .label("WOQL.js query")
      .description("A WOQL.js query that can be referenced from Topics.")

      .property("Query.description", "string")
      .label("Describes what the WOQL.js query does.")

      .property("Query.body", "string")
      .label(
        "JavaScript code of the WOQL.js query (should evaluate to a JS function)"
      )
  );

  await schema.execute(client).catch(console.log);
}

////////////////////////////////////////////////////////////////////////////////

export async function queryPerson(client, docId) {
  const result = await WQ.limit(1)
    .select("v:firstName", "v:lastName", "v:fullName")
    .and(
      WQ.triple(docId, "type", "scm:Person"),
      WQ.triple(docId, "Person.firstName", "v:firstName"),
      WQ.triple(docId, "Person.lastName", "v:lastName")
    )
    .join(["v:firstName", "v:lastName"], " ", "v:fullName")
    .execute(client)
    .catch(console.log);

  const addVal = (acc, key) => {
    const val =
      result &&
      result.bindings &&
      result.bindings[0] &&
      result.bindings[0][key];
    acc[key] = val ? val["@value"] : "";
    return acc;
  };

  const output = ["firstName", "lastName", "fullName"].reduce(
    (acc, key) => addVal(acc, key),
    {}
  );

  return { defaultField: "fullName", output };
}

export async function createPersonQuery(client) {
  await WQ.insert("doc:query.person", "scm:Query")
    .property(
      "Query.description",
      "Returns first and last name of a person. Example: {{person(doc:me)}}."
    )
    .property("Query.body", "" + queryPerson)
    .execute(client, "A document with a query.")
    .catch(console.log);
}

export async function createSchema(client) {
  await createTopic(client).catch(console.log);
  await createPerson(client).catch(console.log);
  await createQuery(client).catch(console.log);
  await createPersonQuery(client).catch(console.log);
}

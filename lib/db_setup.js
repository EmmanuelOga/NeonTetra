import TerminusClient from "@terminusdb/terminusdb-client";

export const WQ = TerminusClient.WOQL;

export const dbUrl = "https://127.0.0.1:6363/";
export const dbUser = "admin";
export const dbKey = "root";
export const dbId = "fishy";
export const dbLabel = "FishyKb";
export const dbDescription = "Emmanuel Oga's KB of Topics";

export function createClient() {
  return new TerminusClient.WOQLClient(dbUrl, {
    user: dbUser,
    key: dbKey,
    db: dbId,
  });
}

async function dbExists(client, dbLabel) {
  client.db("_system");
  const result = await WQ.limit(1)
    .select("v:Label")
    .and(
      WQ.triple("v:client", "type", "system:Database"),
      WQ.triple("v:client", "label", "v:Label"),
      WQ.eq({ "@language": "en", "@value": dbLabel }, "v:Label")
    )
    .execute(client);
  return result.bindings.length > 0;
}

export async function createDatabase(client, deleteExisting) {
  let exists = await dbExists(client, dbLabel);

  if (deleteExisting && exists) {
    try {
      await client.deleteDatabase(dbId);
      exists = false;
      console.log("Previous DB deleted.");
    } catch (e) {}
  }

  client.db(dbId);

  if (exists) {
    console.log("Db already exists.");
  } else {
    const dbdetails = {
      label: dbLabel,
      comment: dbDescription,
      prefixes: {
        scm: "https://eoga.dev/scm",
        doc: "https://eoga.dev/doc",
      },
      schema: true,
    };

    try {
      await client.createDatabase(dbId, dbdetails);
    } catch (e) {
      console.log("Database already existed.");
    }
  }
}

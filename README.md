<a href="https://en.wikipedia.org/wiki/Neon_tetra#/media/File:Neonsalmler_Paracheirodon_innesi.jpg">
  <img src="https://raw.githubusercontent.com/EmmanuelOga/NeonTetra/main/neon.jpg" />
</a>

# Neon Tetra

A CMS proof-of-concept using [TerminusDB](https://terminusdb.com/).

To run, clone the repo, then:

```
$ yarn install
$ node index.js
INPUT
<div>A very cool document from {{person("doc:me")}}</div>.

OUTPUT
<div>A very cool document from Emmanuel Oga</div>.
```
The demo requires a local instance of TerminusDB, which can be [downloaded here](https://terminusdb.com/hub/download).

## Objective

Generate documents (HTML, PDF, etc) from templates stored in a graph database.

The templates should be able to reference data from the same database.

A CMS could be built using these templates (called **Topic**s in this proof-of-concept) as the basic building block.

For a website, a naming convention could be used to match URL paths to topics.

## TerminusDB

Graph stores are great for building knowledge bases, finding hidden connections and inferring new data.

TerminusDB is a graph db that allows storing schema-constrained documents but also arbitrary triples or quads, which grants the best of both worlds:

- It is easy to enforce constraints for a subset of the data.
- But we also have infinite flexibility for storing anything else, without requiring a schema.

Adding new or modifying existing schemas is pretty easy and flexible too.

### Git-like Storage Model

TerminusDB also includes a git-like storage system that allows "branching" the data! It makes it easy to create "staging" versions of the content, or to have a team of people working on the same content in different branches, allowing merging branches together into a "release" branch, etc, great for collaboration.

TerminusDB query and schema language offers some advantages over the alternatives (example alternatives are [SPARQL](https://www.w3.org/TR/sparql11-overview/) for quering, and [SHACL](https://www.w3.org/TR/shacl/) or [ShEx](https://shex.io/shex-semantics/index.html) for schemas).

## Description

### Topics

The templates are stored in `Topic` instances using the following TDB schema:

```js
WQ.doctype("Topic")
  .label("Topic")
  .description("A snippet of content.")

  .property("Topic.body", "string")
  .label("Topic body, can include mustache template tags.");
```

**NOTE**: TerminusDB schemas and WOQL queries are shown as JavaScript client calls here, but both are actually RDF based. The JavaScript code ultimately produces RDF triples which is what TDB understands. The provided client libraries do this for us.

Example data conforming to this schema, expressed as [Turtle serialization](https://www.w3.org/TR/turtle/):

```turtle
doc:wq1
  a scm:Topic ;
  scm:Topic.body """<div>A very cool document from {{person("doc:me")}}.</div>""" .
```

The value of `scm:Topic.body` is a [mustache template](https://mustache.github.io/). Any template language could have been used, but mustache adds minimal syntax and works well for our use case.

The mustache tag implements a call to a `person` function with an argument `"doc:me"`. By naming convertion, we search for a query with Id `doc:query.person`.

### Queries

A `Query` stores a TerminusDB query. In this PoC, the query is expressed as WOQL.js code. The code should evaluate to a JavaScript function that takes as parameters a TerminusDB client and any other user parameter provided in the template.

We use the following schema:

```js
WQ.doctype("Query")
  .label("WOQL.js query")
  .description("A WOQL.js query that can be referenced from topics.")

  .property("Query.description", "string")
  .label("Describes what the WOQL.js query does.")

  .property("Query.body", "string")
  .label(
    "JavaScript code of the WOQL.js query (should evaluate to a JS function)"
  );
```

To create the `person` `Query`, we run this JavaScript code:

```js
// This is the end-user query function that we want to be able to call from the mustache template.
const queryPerson = async (client, docId) =>
  await WQ.limit(1)
    .select("v:firstName", "v:lastName", "v:fullName")
    .and(
      WQ.triple(docId, "type", "scm:Person"),
      WQ.triple(docId, "Person.firstName", "v:firstName"),
      WQ.triple(docId, "Person.lastName", "v:lastName")
    )
    .join(["v:firstName", "v:lastName"], " ", "v:fullName")
    .execute(client);

// Conveniently, it is trivial to serialize a JavaScript function into its source code:
const code = "" + queryPerson;

// Now we insert it into the dabase:
await WQ.insert("doc:query.person", "scm:Query")
  .property(
    "Query.description",
    "Returns first and last name of a person. Example: {{person(doc:me)}}."
  )
  .property("Query.body", code)
  .execute(client, "A document with a query.");
```

Produces the following TDB data:

```turtle
doc:query.person
  a scm:Query ;
  scm:Query.body """
  async (client, docId) =>
    await WQ.limit(1)
      .select("v:firstName", "v:lastName", "v:fullName")
      .and(
        WQ.triple(docId, "type", "scm:Person"),
        WQ.triple(docId, "Person.firstName", "v:firstName"),
        WQ.triple(docId, "Person.lastName", "v:lastName")
      )
      .join(["v:firstName", "v:lastName"], " ", "v:fullName")
      .execute(client);
  """ ;
  scm:Query.description "Returns first and last name of a person. Example: {{person(doc:me)}}." .
```
## Example

Coming back to the example, assuming we have this data in TDB already:

```turtle
doc:me
  a scm:Person ;
  scm:Person.firstName "Emmanuel" ;
  scm:Person.lastName "Oga" .
```

Rendering the `Topic` with "id" `doc:wq1` should produce the following result:

```
INPUT
<div>A very cool document from {{person("doc:me")}}.</div>

OUTPUT
<div>A very cool document from Emmanuel Oga.</div>
```
## Considerations

### WOQL Query Language

At first I was a bit weary of WOQL, but after using it a bit I think it has a few advantages over SPARQL:

- WOQL has machine readable specification, based in [OWL](https://www.w3.org/TR/owl2-syntax/). WOQL queries are RDF graphs!
- WOQL is designed to be composable, which means it is easy to grab an existing query and, say, add one more constraint.
- Being RDF based makes it easier to write clients for TerminusDB for any platform, one just needs to generate RDF triples conforming to WOQL's OWL schema.

There are some disadvantages I can think of:

- With SPARQL it is possible to run queries on the client side without having to talk to a server, since it has native implementations in many languages. TerminusDB is the only implementation of WOQL at the time.
- WOQL is still evolving, so it would be a moving target for alternative implementations.
- WOQL is specified with OWL, but validating OWL seems to be a bit difficult with the existing RDF ecosystem, so validating that a query is properly written following the OWL schema may not be trivial (I don't have much experience with OWL though so I may be wrong).

### TerminusDB Schemas

TerminusDB schemas are based on OWL, and as far as I can tell, the only validation implementation is the TerminusDB server itself. This is in contrast with SHACL or ShEx that can be validated on the client side with implementations in a bunch of different languages.

I don't have much experience with TerminusDB schemas at the moment, so I'm not sure how powerful they are compared to the alternatives. According to the authors, the schema language of TerminusDB is more correct than the alternatives because is based on a [closed-world](https://en.wikipedia.org/wiki/Closed-world_assumption) version of OWL.

### JavaScript exposed as end-user query language

In this PoC, the language used for implementing user-queries is JavaScript. In order to allow untrusted end-users to write their own queries, the runtime could be sandboxed. Another option would be to only allow existing server queries to be called.

A less trusting solution could only allow the triples-version of WOQL queries to be stored. Instead of mustache for templates, which is logic-less, perhaps a slightly more powerful template language could be provided to further format the data from a query result as needed.
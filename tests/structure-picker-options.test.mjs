import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../lib/structure-picker-options.ts", import.meta.url), "utf8");
const loaded = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: loaded, exports: loaded.exports });
const { personPickerOptions, positionPickerOptions } = loaded.exports;
const unit = { id: "services", name: "Fictional Services" };
const library = { id: "library", name: "Fictional Library" };
const person = (id, name, positions = []) => ({ id, name, assignments: positions.map(position => ({ position })) });
const position = (id, title, unit, people = []) => ({ id, title, unit, assignments: people.map(person => ({ person })) });
const plain = value => JSON.parse(JSON.stringify(value));

test("People retain exact stable identities and show documented title and Unit context for namesakes", () => {
  const choices = personPickerOptions([
    person("person-alex-services", "Alex Example", [position("services-coordinator", "Coordinator", unit)]),
    person("person-alex-library", "Alex Example", [position("library-coordinator", "Coordinator", library)]),
    person("person-morgan", "Morgan Example"),
  ]);
  assert.deepEqual(plain(choices), [
    { value: "person-alex-services", label: "Alex Example — Coordinator (Fictional Services)" },
    { value: "person-alex-library", label: "Alex Example — Coordinator (Fictional Library)" },
    { value: "person-morgan", label: "Morgan Example — No current job title recorded" },
  ]);
  assert.doesNotMatch(choices[2].label, /Fictional Services|Fictional Library/);
});

test("all recorded assignments remain visible without inventing Unit context", () => {
  const choices = personPickerOptions([person("person-one", "Fictional Alex", [
    position("one", "Coordinator", unit), position("two", "Reviewer", null),
  ])]);
  assert.equal(choices[0].label, "Fictional Alex — Coordinator (Fictional Services); Reviewer");
});

test("Positions show title, Unit and current People without merging repeated titles", () => {
  const choices = positionPickerOptions([
    position("position-services", "Coordinator", unit, [person("person-alex", "Alex Example"), person("person-morgan", "Morgan Example")]),
    position("position-library", "Coordinator", library),
    position("position-unplaced", "Reviewer", null),
  ]);
  assert.deepEqual(plain(choices), [
    { value: "position-services", label: "Coordinator — Fictional Services — Alex Example, Morgan Example" },
    { value: "position-library", label: "Coordinator — Fictional Library — No current person recorded" },
    { value: "position-unplaced", label: "Reviewer — No Unit recorded — No current person recorded" },
  ]);
  assert.doesNotMatch(choices[1].label, /[Vv]acant/);
});

test("identical Person labels get unique stable record suffixes, never name-derived values", () => {
  const choices = personPickerOptions([
    person("person-11111111", "Fictional Alex"), person("person-22222222", "Fictional Alex"),
  ]);
  assert.deepEqual(plain(choices.map(choice => choice.value)), ["person-11111111", "person-22222222"]);
  assert.match(choices[0].label, /Record 11111111$/);
  assert.match(choices[1].label, /Record 22222222$/);
});

test("identical Position labels get unique record suffixes", () => {
  const choices = positionPickerOptions([
    position("position-11111111", "Coordinator", unit), position("position-22222222", "Coordinator", unit),
  ]);
  assert.deepEqual(plain(choices.map(choice => choice.value)), ["position-11111111", "position-22222222"]);
  assert.match(choices[0].label, /Record 11111111$/);
  assert.match(choices[1].label, /Record 22222222$/);
});

test("record suffix collisions fall back to full exact IDs for People and Positions", () => {
  for (const [toOptions, entities] of [
    [personPickerOptions, [person("first-person-12345678", "Fictional Alex"), person("second-person-12345678", "Fictional Alex")]],
    [positionPickerOptions, [position("first-position-12345678", "Coordinator", unit), position("second-position-12345678", "Coordinator", unit)]],
  ]) {
    const choices = toOptions(entities);
    for (const [index, choice] of choices.entries()) {
      assert.equal(choice.value, entities[index].id);
      assert.ok(choice.label.endsWith(`Record ${entities[index].id}`));
    }
    assert.notEqual(choices[0].label, choices[1].label);
  }
});

test("empty inputs stay empty and formatting does not mutate source identity or assignments", () => {
  assert.deepEqual(plain(personPickerOptions([])), []);
  assert.deepEqual(plain(positionPickerOptions([])), []);
  const people = [person("person-alex", "Fictional Alex", [position("position-one", "Coordinator", unit)])];
  const positions = [position("position-one", "Coordinator", unit, people)];
  const before = JSON.stringify({ people, positions });
  personPickerOptions(people);
  positionPickerOptions(positions);
  assert.equal(JSON.stringify({ people, positions }), before);
});

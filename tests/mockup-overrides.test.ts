import assert from "node:assert/strict";
import { test } from "node:test";

import { currentMockupSetup, findDuplicateMockup, isMockupChangeScope, mockupsInScope, spreadMockupChange } from "@/helpers/mockup-overrides";
import type { MockupImage, MockupOverride, MockupTemplate } from "@/types/mockup-templates";

const tee = "tee-template";
const boxy = "boxy-template";
const mug = "mug-template";
const printArea = JSON.stringify({ x: 150, y: 250, width: 300, height: 300 });

const mockup = (id: string, templateId: string, extra: Partial<MockupImage> = {}): MockupImage => ({
  id, productId: "product", designImageId: "design", mockupTemplateId: templateId, mockupImageUrl: `https://cdn/${id}.jpg`,
  mockupWidthPx: 2000, mockupHeightPx: 2000, approvalStatus: "pending", garmentColor: null, backgroundColor: null, slotKey: `slot-${id}`, override: null, ...extra,
});
const template = (id: string, allowBackground: boolean) => ({ id, name: id, allowBackground, printAreaConfig: printArea }) as MockupTemplate;
const templatesById = new Map([tee, boxy, mug].map((id) => [id, template(id, id !== mug)]));

const navy = "#1F3B7A";
const grey = "#9CA3AF";
const edited = mockup("edited", tee, { garmentColor: navy });
const greyTee = mockup("grey-tee", tee, { garmentColor: grey, override: { mockupTemplateId: tee, garmentColor: grey, backgroundColor: null, printArea: { x: 1, y: 2, width: 3, height: 4 } } });
const redTee = mockup("red-tee", tee, { garmentColor: "#B22222" });
const boxyTee = mockup("boxy", boxy, { garmentColor: navy });
const noSlot = mockup("preview", tee, { slotKey: null });
const all = [edited, greyTee, redTee, boxyTee, noSlot];
const setupOf = (image: MockupImage, extra: Partial<MockupOverride> = {}): MockupOverride => ({ ...currentMockupSetup(image), ...extra });

test("a mock-up's setup is its own change, else what the job's settings made", () => {
  assert.deepEqual(currentMockupSetup(redTee), { mockupTemplateId: tee, garmentColor: "#B22222", backgroundColor: null, printArea: null });
  assert.equal(currentMockupSetup(greyTee), greyTee.override);
});

test("the scope reaches nothing or the other mock-ups of the same template", () => {
  assert.deepEqual(mockupsInScope(all, edited, tee, "this"), []);
  assert.deepEqual(mockupsInScope(all, edited, tee, "template").map((item) => item.id), ["grey-tee", "red-tee"]);
  assert.deepEqual(mockupsInScope(all, edited, boxy, "template").map((item) => item.id), ["boxy"]);
  assert.ok(isMockupChangeScope("template"));
  assert.ok(!isMockupChangeScope("all"));
});

test("the background and position are copied and each mock-up keeps its garment color", () => {
  const change = setupOf(edited, { backgroundColor: "#EDE6DA", printArea: { x: 10, y: 20, width: 300, height: 300 } });
  const spread = spreadMockupChange(change, mockupsInScope(all, edited, tee, "template"), templatesById);

  assert.deepEqual(spread.map((item) => item.slotKey), ["slot-grey-tee", "slot-red-tee"]);
  assert.deepEqual(spread[0]?.override, { mockupTemplateId: tee, garmentColor: grey, backgroundColor: "#EDE6DA", printArea: change.printArea });
  assert.equal(spread[1]?.override.garmentColor, "#B22222");
  assert.equal(spread[1]?.replacedMockupImageId, "red-tee");
});

test("a mock-up the copy would leave as it is is not saved again", () => {
  assert.deepEqual(spreadMockupChange(setupOf(edited), [redTee], templatesById), []);
});

test("a garment color another mock-up of the design already has on that template is a duplicate", () => {
  const duplicate = findDuplicateMockup(all, edited, setupOf(edited, { garmentColor: "#b22222" }), [], templatesById);
  assert.equal(duplicate?.image.id, "red-tee");
  // The same color on another template, or the color it already had, is not.
  assert.equal(findDuplicateMockup(all, edited, setupOf(edited), [], templatesById), null);
  assert.equal(findDuplicateMockup([edited, boxyTee], edited, setupOf(edited), [], templatesById), null);
  // Another design in that color is a different picture.
  assert.equal(findDuplicateMockup([edited, { ...redTee, designImageId: "other" }], edited, setupOf(edited, { garmentColor: "#B22222" }), [], templatesById), null);
});

test("the template's own print area and no print area are the same place", () => {
  const sameAsRed = setupOf(edited, { garmentColor: "#B22222", printArea: { x: 150, y: 250, width: 300, height: 300 } });
  assert.equal(findDuplicateMockup(all, edited, sameAsRed, [], templatesById)?.image.id, "red-tee");
  const moved = setupOf(edited, { garmentColor: "#B22222", printArea: { x: 151, y: 250, width: 300, height: 300 } });
  assert.equal(findDuplicateMockup(all, edited, moved, [], templatesById), null);
});

test("a copy that makes two mock-ups alike is a duplicate too", () => {
  // Two red mock-ups already differ only in where the design sits; copying one position onto both makes them alike.
  const otherRed = mockup("other-red", tee, { garmentColor: "#B22222", override: { mockupTemplateId: tee, garmentColor: "#B22222", backgroundColor: null, printArea: { x: 5, y: 5, width: 300, height: 300 } } });
  const images = [edited, redTee, otherRed];
  const change = setupOf(edited, { printArea: { x: 9, y: 9, width: 300, height: 300 } });
  const spread = spreadMockupChange(change, mockupsInScope(images, edited, tee, "template"), templatesById);
  assert.ok(findDuplicateMockup(images, edited, change, spread, templatesById));
});

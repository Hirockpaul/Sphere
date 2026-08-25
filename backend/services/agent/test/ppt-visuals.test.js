import assert from "node:assert/strict";
import test from "node:test";
import { ensurePresentationVisuals } from "../agents/ppt.agent.js";

test("adds two image requests when the presentation planner supplies none", () => {
  const data = {
    title: "Future of Energy",
    slides: [
      { type: "cover", title: "Future of Energy", visual: { required: false, type: "none" } },
      { type: "content", title: "The Transition", visual: { required: false, type: "none" } },
      { type: "process", title: "Three Steps", visual: { required: false, type: "none" } },
      { type: "takeaway", title: "Act Now", visual: { required: false, type: "none" } },
    ],
  };

  const result = ensurePresentationVisuals(data);
  const visuals = result.slides.filter((slide) => slide.visual?.required);
  assert.equal(visuals.length, 2);
  assert.ok(visuals.every((slide) => slide.visual.prompt && slide.visual.alt));
});

test("caps model-requested images at four", () => {
  const data = {
    title: "Deck",
    slides: Array.from({ length: 6 }, (_, index) => ({
      type: index === 0 ? "cover" : "content",
      title: `Slide ${index + 1}`,
      visual: { required: true, type: "photo", prompt: "photo", alt: "photo" },
    })),
  };
  const result = ensurePresentationVisuals(data);
  assert.equal(result.slides.filter((slide) => slide.visual?.required).length, 4);
});

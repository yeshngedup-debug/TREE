import { expect, test } from "@playwright/test";
import { leafCursorFilter } from "../src/lib/leaf-cursor";

test("leaf cursor binds the id to its own parameter", () => {
  const cursor = {
    created_at: "2026-11-15T06:00:00.000Z",
    id: "0b7a2f9e-0000-4000-8000-000000000000",
  };
  const { filter, params } = leafCursorFilter(cursor);
  expect(filter).toBe(
    " and (created_at < $1 or (created_at = $1 and id < $2))",
  );
  expect(params).toEqual([cursor.created_at, cursor.id]);
  expect(params).toHaveLength(2);
});

test("leaf cursor without a cursor adds no filter or parameters", () => {
  expect(leafCursorFilter()).toEqual({ filter: "", params: [] });
});

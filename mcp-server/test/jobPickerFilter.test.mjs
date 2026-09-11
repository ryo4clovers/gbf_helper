import { test } from "node:test";
import assert from "node:assert/strict";
import {
  JOB_CLASS_FILTER_ORDER,
  filterAndSortJobs,
} from "../web/job-picker-filter.js";

const jobs = [
  { jobId: "100301", name: "ベルセルク", nameEn: "Berserker", classTier: "ClassIV", weaponKinds: [{ name: "剣" }] },
  { jobId: "100001", name: "ファイター", nameEn: "Fighter", classTier: "ClassI", weaponKinds: [{ name: "剣" }] },
  { jobId: "190301", name: "アプサラス", nameEn: "Apsaras", classTier: "ClassIV", weaponKinds: [{ name: "槍" }] },
];

test("shows every job in numeric ID order when no class is selected", () => {
  assert.deepEqual(filterAndSortJobs(jobs).map((job) => job.jobId), ["100001", "100301", "190301"]);
});

test("combines class and search filters", () => {
  assert.deepEqual(
    filterAndSortJobs(jobs, "槍", "ClassIV").map((job) => job.name),
    ["アプサラス"],
  );
  assert.deepEqual(filterAndSortJobs(jobs, "ファイター", "ClassIV"), []);
});

test("keeps class filter buttons in the requested progression", () => {
  assert.deepEqual(JOB_CLASS_FILTER_ORDER, [
    "ClassI", "ClassII", "ClassIII", "ClassIV", "ClassV", "エクストラ", "エクストラII", "オリジン",
  ]);
});

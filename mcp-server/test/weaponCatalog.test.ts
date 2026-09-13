import { test } from "node:test";
import assert from "node:assert/strict";
import { loadIncrementalWeaponCatalog } from "../src/calculator/weaponCatalog.ts";

test("loads the initial incremental weapon and skill catalog", () => {
  const catalog = loadIncrementalWeaponCatalog();

  assert.equal(catalog.weapons.size, 2971);
  assert.equal(catalog.skills.size, 740);
  assert.deepEqual(catalog.weapons.get("1020500200")?.skillSlots, [
    { sourceKey: "skill1", skillId: "1" },
  ]);
  const fireMightEffects = catalog.skills.get("1")?.effects
    .filter((effect) => effect.kind === "normal-attack-up") ?? [];
  assert.deepEqual(
    [1, 2, 3, 4, 15, 20].map((skillLevel) => {
      const effect = fireMightEffects.find((candidate) => candidate.skillLevel === skillLevel);
      return [skillLevel, effect?.amountPercent, effect?.verificationStatus];
    }),
    [
      [1, 1, "検証済み"],
      [2, 2, "検証済み"],
      [3, 3, "検証済み"],
      [4, 4, "下書き"],
      [15, 12, "検証済み"],
      [20, 13, "下書き"],
    ],
  );
  assert.equal(fireMightEffects.some((effect) => effect.skillLevel === 16), false);
  const normalAttackTableCases = [
    ["18", [[10, 12], [15, 14.5], [20, 16]]],
    ["213", [[10, 16], [15, 20], [20, 22]]],
    ["327", [[10, 12], [15, 14.5], [20, 16]]],
    ["387", [[10, 12], [15, 14.5], [20, 16]]],
    ["776", [[10, 12], [15, 14.5], [20, 16]]],
    ["1128", [[10, 15], [15, 18], [20, 20]]],
    ["1511", [[10, 12], [15, 14.5], [20, 16]]],
    ["1655", [[10, 15], [15, 18], [20, 20]]],
    ["17", [[10, 12], [15, 14.5], [20, 16]]],
    ["385", [[10, 12], [15, 14.5], [20, 16]]],
    ["767", [[10, 12], [15, 14.5], [20, 15.5]]],
    ["768", [[10, 12], [15, 14.5], [20, 15.5]]],
    ["775", [[10, 12], [15, 14.5], [20, 16]]],
    ["848", [[10, 10], [15, 12], [20, 13]]],
    ["1510", [[10, 12], [15, 14.5], [20, 16]]],
    ["1653", [[10, 15], [15, 18], [20, 20]]],
    ["1654", [[10, 15], [15, 18], [20, 20]]],
    ["15", [[10, 12], [15, 14.5], [20, 16]]],
    ["773", [[10, 12], [15, 14.5], [20, 16]]],
    ["847", [[10, 10], [15, 12], [20, 13]]],
    ["1508", [[10, 12], [15, 14.5], [20, 16]]],
    ["1652", [[10, 15], [15, 18], [20, 20]]],
    ["2519", [[10, 15], [15, 18], [20, 20]]],
    ["13", [[10, 12], [15, 14.5], [20, 16]]],
    ["26", [[10, 15], [15, 18], [20, 20]]],
    ["323", [[10, 12], [15, 14.5], [20, 16]]],
    ["383", [[10, 12], [15, 14.5], [20, 16]]],
    ["375", [[10, 10], [15, 12], [20, 12.5]]],
    ["765", [[10, 12], [15, 14.5], [20, 15.5]]],
    ["1228", [[10, 15], [15, 18], [20, 20]]],
    ["626", [[10, 17], [15, 22]]],
    ["1551", [[10, 25], [15, 33]]],
    ["208", [[10, 16], [15, 20], [20, 22]]],
    ["764", [[10, 12], [15, 14.5], [20, 15.5]]],
    ["770", [[10, 15], [15, 18], [20, 20]]],
    ["771", [[10, 12], [15, 14.5], [20, 16]]],
    ["1422", [[10, 16], [15, 20], [20, 22]]],
    ["2", [[10, 10], [15, 12], [20, 13]]],
    ["14", [[10, 12], [15, 14.5], [20, 16]]],
    ["209", [[10, 16], [15, 20], [20, 22]]],
    ["336", [[10, 15], [15, 18], [20, 20]]],
    ["627", [[10, 17], [15, 22]]],
    ["846", [[10, 10], [15, 12], [20, 13]]],
    ["1417", [[10, 15], [15, 18], [20, 20]]],
    ["1507", [[10, 12], [15, 14.5], [20, 16]]],
    ["1651", [[10, 15], [15, 18], [20, 20]]],
    ["1650", [[10, 15], [15, 18], [20, 20]]],
    ["27", [[10, 15], [15, 18], [20, 20]]],
    ["210", [[10, 16], [15, 20], [20, 22]]],
    ["324", [[10, 12], [15, 14.5], [20, 16]]],
    ["337", [[10, 15], [15, 18], [20, 20]]],
    ["384", [[10, 12], [15, 14.5], [20, 16]]],
    ["628", [[10, 17], [15, 22]]],
    ["766", [[10, 12], [15, 14.5], [20, 15.5]]],
    ["869", [[10, 10], [15, 12], [20, 13]]],
    ["867", [[10, 10], [15, 12], [20, 13]]],
    ["1031", [[10, 16], [15, 20], [20, 22]]],
    ["5", [[10, 10], [15, 12], [20, 13]]],
    ["29", [[10, 15], [15, 18], [20, 20]]],
    ["212", [[10, 16], [15, 20], [20, 22]]],
    ["630", [[10, 17], [15, 22]]],
    ["326", [[10, 12], [15, 14.5], [20, 16]]],
    ["849", [[10, 10], [15, 12], [20, 13]]],
    ["1426", [[10, 16], [15, 20], [20, 22]]],
    ["871", [[10, 10], [15, 12], [20, 13]]],
    ["339", [[10, 15], [15, 18], [20, 20]]],
    ["621", [[10, 18], [15, 23], [20, 25.5]]],
    ["378", [[10, 10], [15, 12], [20, 12.5]]],
    ["1232", [[10, 15], [15, 18], [20, 20]]],
    ["4", [[10, 10], [15, 12], [20, 13]]],
    ["16", [[10, 12], [15, 14.5], [20, 16]]],
    ["28", [[10, 15], [15, 18], [20, 20]]],
    ["211", [[10, 16], [15, 20], [20, 22]]],
    ["629", [[10, 17], [15, 22]]],
    ["325", [[10, 12], [15, 14.5], [20, 16]]],
    ["338", [[10, 15], [15, 18], [20, 20]]],
    ["774", [[10, 12], [15, 14.5], [20, 16]]],
    ["870", [[10, 10], [15, 12], [20, 13]]],
    ["1509", [[10, 12], [15, 14.5], [20, 16]]],
    ["377", [[10, 10], [15, 12], [20, 12.5]]],
    ["1231", [[10, 15], [15, 18], [20, 20]]],
    ["6", [[10, 10], [15, 12], [20, 13]]],
    ["30", [[10, 15], [15, 18], [20, 20]]],
    ["631", [[10, 17], [15, 22]]],
    ["850", [[10, 10], [15, 12], [20, 13]]],
    ["340", [[10, 15], [15, 18], [20, 20]]],
    ["615", [[10, 18], [15, 23], [20, 25.5]]],
    ["872", [[10, 10], [15, 12], [20, 13]]],
    ["769", [[10, 12], [15, 14.5], [20, 15.5]]],
    ["379", [[10, 10], [15, 12], [20, 12.5]]],
  ] as const;
  for (const [skillId, expected] of normalAttackTableCases) {
    const effects = catalog.skills.get(skillId)?.effects
      .filter((effect) => effect.kind === "normal-attack-up") ?? [];
    assert.deepEqual(
      effects.map((effect) => [effect.skillLevel, effect.amountPercent]),
      expected,
      `normal attack table for skill ${skillId}`,
    );
    assert.equal(effects.every((effect) => effect.verificationStatus === "下書き"), true);
  }
  const normalHpTableCases = [
    ["12", [[10, 12], [15, 14], [20, 16]]],
    ["24", [[10, 15], [15, 17]]],
    ["36", [[10, 18], [15, 21], [20, 24]]],
    ["521", [[10, 15], [15, 17]]],
    ["1182", [[10, 15], [15, 17]]],
    ["1433", [[10, 12], [15, 14], [20, 16]]],
    ["2506", [[10, 12], [15, 14], [20, 16]]],
    ["10", [[10, 12], [15, 14], [20, 16]]],
    ["11", [[10, 12], [15, 14], [20, 16]]],
    ["22", [[10, 15], [15, 17]]],
    ["23", [[10, 15], [15, 17]]],
    ["520", [[10, 15], [15, 17]]],
    ["767", [[1, 3], [10, 12], [15, 14.5], [20, 15.5]]],
    ["768", [[1, 3], [10, 12], [15, 14.5], [20, 15.5]]],
    ["1180", [[10, 15], [15, 17]]],
    ["1181", [[10, 15], [15, 17]]],
    ["2505", [[10, 12], [15, 14], [20, 16]]],
    ["9", [[10, 12], [15, 14], [20, 16]]],
    ["21", [[10, 15], [15, 17]]],
    ["33", [[10, 18], [15, 21], [20, 24]]],
    ["518", [[10, 15], [15, 17]]],
    ["1179", [[10, 15], [15, 17]]],
    ["2503", [[10, 12], [15, 14], [20, 16]]],
    ["8", [[10, 12], [15, 14], [20, 16]]],
    ["20", [[10, 15], [15, 17]]],
    ["35", [[10, 18], [15, 21], [20, 24]]],
    ["1035", [[10, 12], [15, 14], [20, 16]]],
    ["1177", [[10, 15], [15, 17]]],
    ["1178", [[10, 15], [15, 17]]],
    ["1429", [[10, 12], [15, 14], [20, 16]]],
    ["375", [[1, 1], [10, 10], [15, 12], [20, 12.5]]],
    ["765", [[1, 3], [10, 12], [15, 14.5], [20, 15.5]]],
    ["1228", [[1, 6], [10, 15], [15, 18], [20, 20]]],
    ["7", [[10, 12], [15, 14], [20, 16]]],
    ["19", [[10, 15], [15, 17]]],
    ["764", [[1, 3], [10, 12], [15, 14.5], [20, 15.5]]],
    ["32", [[10, 18], [15, 21], [20, 24]]],
    ["31", [[10, 18], [15, 21], [20, 24]]],
    ["766", [[1, 3], [10, 12], [15, 14.5], [20, 15.5]]],
    ["1037", [[10, 12], [15, 14], [20, 16]]],
    ["378", [[1, 1], [10, 10], [15, 12], [20, 12.5]]],
    ["1232", [[1, 6], [10, 15], [15, 18], [20, 20]]],
    ["1432", [[10, 12], [15, 14], [20, 16]]],
    ["34", [[10, 18], [15, 21], [20, 24]]],
    ["377", [[1, 1], [10, 10], [15, 12], [20, 12.5]]],
    ["379", [[1, 1], [10, 10], [15, 12], [20, 12.5]]],
    ["769", [[1, 3], [10, 12], [15, 14.5], [20, 15.5]]],
    ["1231", [[1, 6], [10, 15], [15, 18], [20, 20]]],
  ] as const;
  for (const [skillId, expected] of normalHpTableCases) {
    const effects = catalog.skills.get(skillId)?.effects
      .filter((effect) => effect.kind === "normal-hp-up") ?? [];
    assert.deepEqual(
      effects.map((effect) => [effect.skillLevel, effect.amountPercent]),
      expected,
      `normal HP table for skill ${skillId}`,
    );
    assert.equal(effects.every((effect) => effect.verificationStatus === "下書き"), true);
  }
  assert.equal(catalog.skills.get("375")?.unsupportedEffects, undefined);
  assert.deepEqual(catalog.weapons.get("1040611800")?.skillSlots, [
    { sourceKey: "skill1", skillId: "1089" },
    { sourceKey: "skill2", skillId: "1337" },
  ]);
  assert.equal(catalog.weapons.get("1040611800")?.name, "ニーベルン・グラス");
  assert.equal(catalog.weapons.get("1040320100")?.name, "アイナ・アラカイ");
  assert.equal(catalog.weapons.get("1040622200")?.name, "神狼暗牙");
  assert.equal(catalog.skills.get("1089")?.confirmedAt, "2026-09-13");
  assert.deepEqual(catalog.weapons.get("1040009400")?.skillSlots, [
    { sourceKey: "skill1", skillId: "89" },
    { sourceKey: "skill2", skillId: "385" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040426100")?.skillSlots, [
    { sourceKey: "skill1", skillId: "514" },
    { sourceKey: "skill2", skillId: "1499" },
  ]);
  assert.equal(catalog.weapons.get("1040112200")?.name, "タミン・サリ");
  assert.equal(catalog.weapons.get("1040426100")?.name, "サンセットライドリークス");
  assert.equal(catalog.weapons.get("1040622100")?.name, "第五辰行肌護油");
  assert.equal(catalog.skills.get("385")?.confirmedAt, "2026-09-13");
  assert.equal(catalog.skills.get("1499")?.confirmedAt, "2026-09-13");
  assert.deepEqual(catalog.weapons.get("1040022100")?.skillSlots, [
    { sourceKey: "skill1", skillId: "776" },
    { sourceKey: "skill2", skillId: "79" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040221300")?.skillSlots, [
    { sourceKey: "skill1", skillId: "769" },
    { sourceKey: "skill2", skillId: "419" },
  ]);
  assert.equal(catalog.weapons.get("1040022100")?.name, "ライトニング・シュヴァルツ");
  assert.equal(catalog.weapons.get("1040221300")?.name, "マッシブ・メンター・ドリル");
  assert.equal(catalog.skills.get("213")?.confirmedAt, "2026-09-13");
  assert.deepEqual(catalog.weapons.get("1040201400")?.skillSlots, [
    { sourceKey: "skill1", skillId: "25" },
    { sourceKey: "skill2", skillId: "74" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040218900")?.skillSlots, [
    { sourceKey: "skill1", skillId: "2025" },
    { sourceKey: "skill2", skillId: "845" },
    { sourceKey: "skill3", skillId: "2174" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040007100")?.skillSlots, [
    { sourceKey: "skill1", skillId: "322" },
    { sourceKey: "skill2", skillId: "118" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040915300")?.skillSlots, [
    { sourceKey: "skill1", skillId: "510" },
    { sourceKey: "skill2", skillId: "80" },
    { sourceKey: "skill3", skillId: "1" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040206800")?.skillSlots, [
    { sourceKey: "skill1", skillId: "335" },
    { sourceKey: "skill2", skillId: "396" },
  ]);
  const sharedWeaponSkillSlots = new Map([
    ["1040023700", [["skill1", "1913"], ["skill2", "375"]]],
    ["1040024600", [["skill1", "19"], ["skill2", "1296"], ["skill3", "1506"]]],
    ["1040314900", [["skill1", "1664"], ["skill2", "764"]]],
    ["1040410100", [["skill1", "770"], ["skill2", "771"]]],
    ["1040418900", [["skill1", "1228"], ["skill2", "7"]]],
    ["1040612700", [["skill1", "1422"], ["skill2", "632"]]],
    ["1040805100", [["skill1", "494"], ["skill2", "25"]]],
    ["1040906700", [["skill1", "208"], ["skill2", "601"]]],
  ]);
  for (const [weaponId, expected] of sharedWeaponSkillSlots) {
    assert.deepEqual(
      catalog.weapons.get(weaponId)?.skillSlots.map(({ sourceKey, skillId }) => [sourceKey, skillId]),
      expected,
      `skill slots for weapon ${weaponId}`,
    );
  }
  const sharedWaterWeaponSkillSlots = new Map([
    ["1040004600", [["skill1", "627"], ["skill2", "633"]]],
    ["1040011200", [["skill1", "209"], ["skill2", "783"]]],
    ["1040201200", [["skill1", "32"], ["skill2", "2"]]],
    ["1040217800", [["skill1", "1651"], ["skill2", "119"], ["skill3", "14"]]],
    ["1040420100", [["skill1", "268"], ["skill2", "765"], ["skill3", "415"]]],
    ["1040518100", [["skill1", "1507"], ["skill2", "2466"], ["skill3", "2558"]]],
    ["1040606000", [["skill1", "336"], ["skill2", "81"]]],
    ["1040703800", [["skill1", "370"], ["skill2", "1009"], ["skill3", "846"]]],
    ["1040708700", [["skill1", "1417"], ["skill2", "2"]]],
    ["1040918400", [["skill1", "2915"], ["skill2", "2481"], ["skill3", "2175"]]],
  ]);
  for (const [weaponId, expected] of sharedWaterWeaponSkillSlots) {
    assert.deepEqual(
      catalog.weapons.get(weaponId)?.skillSlots.map(({ sourceKey, skillId }) => [sourceKey, skillId]),
      expected,
      `skill slots for water weapon ${weaponId}`,
    );
  }
  const sharedEarthWeaponSkillSlots = new Map([
    ["1040020900", [["skill1", "1646"], ["skill2", "869"]]],
    ["1040028500", [["skill1", "2572"], ["skill2", "2578"], ["skill3", "2584"]]],
    ["1040110600", [["skill1", "1031"], ["skill2", "1037"]]],
    ["1040116400", [["skill1", "1947"], ["skill2", "376"]]],
    ["1040208100", [["skill1", "210"], ["skill2", "779"]]],
    ["1040305800", [["skill1", "27"], ["skill2", "120"]]],
    ["1040312900", [["skill1", "1201"], ["skill2", "766"]]],
    ["1040506100", [["skill1", "337"], ["skill2", "371"]]],
    ["1040615800", [["skill1", "324"], ["skill2", "1316"], ["skill3", "1658"]]],
    ["1040803600", [["skill1", "376"], ["skill2", "384"]]],
    ["1040910000", [["skill1", "628"], ["skill2", "916"]]],
  ]);
  for (const [weaponId, expected] of sharedEarthWeaponSkillSlots) {
    assert.deepEqual(
      catalog.weapons.get(weaponId)?.skillSlots.map(({ sourceKey, skillId }) => [sourceKey, skillId]),
      expected,
      `skill slots for earth weapon ${weaponId}`,
    );
  }
  const sharedLightWeaponSkillSlots = new Map([
    ["1040007200", [["skill1", "306"], ["skill2", "5"]]],
    ["1040017000", [["skill1", "2196"], ["skill2", "2210"], ["skill3", "1726"]]],
    ["1040025900", [["skill1", "2029"], ["skill2", "849"], ["skill3", "2286"]]],
    ["1040112500", [["skill1", "1426"], ["skill2", "1432"]]],
    ["1040115700", [["skill1", "3015"], ["skill2", "3017"], ["skill3", "1232"], ["skill4", "3019"]]],
    ["1040207000", [["skill1", "630"], ["skill2", "918"]]],
    ["1040207900", [["skill1", "212"], ["skill2", "610"]]],
    ["1040418600", [["skill1", "1668"], ["skill2", "326"]]],
    ["1040504900", [["skill1", "339"], ["skill2", "1007"], ["skill3", "1264"]]],
    ["1040513700", [["skill1", "1832"], ["skill2", "1961"], ["skill3", "378"]]],
    ["1040703500", [["skill1", "29"], ["skill2", "122"]]],
    ["1040813700", [["skill1", "1648"], ["skill2", "871"]]],
    ["1040906800", [["skill1", "621"], ["skill2", "611"]]],
  ]);
  for (const [weaponId, expected] of sharedLightWeaponSkillSlots) {
    assert.deepEqual(
      catalog.weapons.get(weaponId)?.skillSlots.map(({ sourceKey, skillId }) => [sourceKey, skillId]),
      expected,
      `skill slots for light weapon ${weaponId}`,
    );
  }
  const sharedWindWeaponSkillSlots = new Map([
    ["1040008900", [["skill1", "493"], ["skill2", "28"]]],
    ["1040022000", [["skill1", "1413"], ["skill2", "16"], ["skill3", "1659"]]],
    ["1040024200", [["skill1", "1954"], ["skill2", "377"]]],
    ["1040105400", [["skill1", "629"], ["skill2", "774"]]],
    ["1040109000", [["skill1", "338"], ["skill2", "513"]]],
    ["1040117200", [["skill1", "2028"], ["skill2", "870"], ["skill3", "2034"]]],
    ["1040207600", [["skill1", "211"], ["skill2", "83"]]],
    ["1040212500", [["skill1", "2195"], ["skill2", "2209"], ["skill3", "2215"]]],
    ["1040217400", [["skill1", "1929"], ["skill2", "1930"], ["skill3", "1231"], ["skill4", "3005"]]],
    ["1040313100", [["skill1", "1509"], ["skill2", "139"], ["skill3", "1754"]]],
    ["1040700900", [["skill1", "34"], ["skill2", "4"]]],
    ["1040705200", [["skill1", "325"], ["skill2", "429"]]],
    ["1040912400", [["skill1", "1551"], ["skill2", "1552"]]],
  ]);
  for (const [weaponId, expected] of sharedWindWeaponSkillSlots) {
    assert.deepEqual(
      catalog.weapons.get(weaponId)?.skillSlots.map(({ sourceKey, skillId }) => [sourceKey, skillId]),
      expected,
      `skill slots for wind weapon ${weaponId}`,
    );
  }
  const sharedDarkWeaponSkillSlots = new Map([
    ["1040008700", [["skill1", "631"], ["skill2", "850"]]],
    ["1040106500", [["skill1", "340"], ["skill2", "401"]]],
    ["1040113200", [["skill1", "1828"], ["skill2", "1962"], ["skill3", "379"]]],
    ["1040216900", [["skill1", "1649"], ["skill2", "872"]]],
    ["1040307100", [["skill1", "769"], ["skill2", "782"]]],
    ["1040408700", [["skill1", "30"], ["skill2", "278"]]],
    ["1040605900", [["skill1", "135"], ["skill2", "6"]]],
    ["1040706000", [["skill1", "615"], ["skill2", "616"]]],
    ["1040911000", [["skill1", "2197"], ["skill2", "2209"], ["skill3", "2229"]]],
  ]);
  for (const [weaponId, expected] of sharedDarkWeaponSkillSlots) {
    assert.deepEqual(
      catalog.weapons.get(weaponId)?.skillSlots.map(({ sourceKey, skillId }) => [sourceKey, skillId]),
      expected,
      `skill slots for dark weapon ${weaponId}`,
    );
  }
  assert.deepEqual(catalog.weapons.get("1040812900")?.skillSlots, [
    { sourceKey: "skill1", skillId: "1506" },
    { sourceKey: "skill2", skillId: "639" },
  ]);
  const sharedFireGachaWeaponSkillSlots = new Map([
    ["1040000000", [["skill1", "25"], ["skill2", "498"]]],
    ["1040004400", [["skill1", "25"], ["skill2", "241"], ["skill3", "824"]]],
    ["1040915800", [["skill1", "1171"]]],
  ]);
  for (const [weaponId, expected] of sharedFireGachaWeaponSkillSlots) {
    assert.deepEqual(
      catalog.weapons.get(weaponId)?.skillSlots.map(({ sourceKey, skillId }) => [sourceKey, skillId]),
      expected,
      `skill slots for fire gacha weapon ${weaponId}`,
    );
  }
  assert.equal(catalog.skills.get("498")?.confirmedAt, "2026-09-13");
  const sharedWaterGachaWeaponSkillSlots = new Map([
    ["1040000100", [["skill1", "26"], ["skill2", "81"]]],
    ["1040122900", [["skill1", "323"], ["skill2", "1657"], ["skill3", "2949"]]],
    ["1040918900", [["skill1", "652"], ["skill2", "1286"], ["skill3", "778"]]],
  ]);
  for (const [weaponId, expected] of sharedWaterGachaWeaponSkillSlots) {
    assert.deepEqual(
      catalog.weapons.get(weaponId)?.skillSlots.map(({ sourceKey, skillId }) => [sourceKey, skillId]),
      expected,
      `skill slots for water gacha weapon ${weaponId}`,
    );
  }
  assert.equal(catalog.skills.get("2949")?.confirmedAt, "2026-09-13");
  assert.deepEqual(catalog.weapons.get("1040220800")?.skillSlots, [
    { sourceKey: "skill1", skillId: "2801" },
    { sourceKey: "skill2", skillId: "2807" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040401500")?.levelStats, {
    maximumLevel: 200,
    points: [
      { level: 1, attack: 325, hp: 40 },
      { level: 100, attack: 1960, hp: 258 },
      { level: 150, attack: 2290, hp: 302 },
      { level: 200, attack: 2450, hp: 324 },
    ],
  });
  assert.deepEqual(catalog.weapons.get("1040101500")?.levelStats, {
    maximumLevel: 200,
    points: [
      { level: 1, attack: 340, hp: 37 },
      { level: 100, attack: 2155, hp: 219 },
      { level: 150, attack: 2520, hp: 255 },
      { level: 200, attack: 2700, hp: 273 },
    ],
  });
  assert.deepEqual(catalog.weapons.get("1040808200")?.levelStats, {
    maximumLevel: 150,
    points: [
      { level: 1, attack: 322, hp: 65 },
      { level: 100, attack: 2044, hp: 226 },
      { level: 150, attack: 2390, hp: 260 },
    ],
  });
  assert.deepEqual(catalog.weapons.get("1040808200")?.skillSlots, [
    { sourceKey: "skill1", skillId: "64" },
    { sourceKey: "skill2", skillId: "932" },
  ]);
  assert.deepEqual(
    catalog.skills.get("510")?.effects
      .filter((effect) => effect.skillLevel === 15)
      .map((effect) => [effect.kind, effect.amountPercent]),
    [
      ["double-attack-rate-up", 7],
      ["triple-attack-rate-up", 7],
    ],
  );
  assert.equal(catalog.skills.get("2025")?.verificationStatus, "検証済み");
  assert.equal(catalog.skills.get("845")?.verificationStatus, "検証済み");
  assert.equal(catalog.skills.get("2174")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("396")?.verificationStatus, "検証済み");
  assert.deepEqual(
    catalog.skills.get("322")?.effects
      .filter((effect) => effect.skillLevel === 15)
      .map((effect) => [effect.kind, effect.amountPercent]),
    [
      ["normal-attack-up", 14.5],
      ["critical-rate-up", 6.5],
    ],
  );
  assert.equal(catalog.skills.get("1506")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("2801")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("94")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("66")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("64")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("932")?.verificationStatus, "下書き");
  assert.deepEqual(
    catalog.skills.get("74")?.effects
      .filter((effect) => effect.kind === "critical-rate-up")
      .map((effect) => [effect.skillLevel, effect.amountPercent, effect.verificationStatus]),
    [
      [15, 3, "検証済み"],
      [10, 2, "下書き"],
      [20, 4, "下書き"],
    ],
  );
  assert.equal(
    catalog.skills.get("1547")?.effects[0]?.source,
    "ユーザー提供の攻略Wiki表画像（2026-09-09）",
  );
});

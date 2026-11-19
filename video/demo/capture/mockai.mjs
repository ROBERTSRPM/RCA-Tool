// Recording-browser-only stand-in for /api/ai/* (used only because the QA account hit the daily AI limit).
// Same response shape as the real routes (see web/lib/ai/mock.ts); text is written for the sample P-101.
export async function installMockAi(page) {
  await page.route("**/api/ai/*", async (route) => {
    const req = route.request();
    const feature = req.url().split("/").pop();
    let body = {};
    try { body = JSON.parse(req.postData() || "{}"); } catch {}
    const nodes = body.context?.nodes ?? [];
    const alias = (re) => { const i = nodes.findIndex((n) => re.test(n.text)); return `N${(i < 0 ? 0 : i) + 1}`; };
    let result;
    if (feature === "coach") {
      const A = alias(/^A\. Bearings/), B = alias(/^B\. Mechanical seals/), R = alias(/^ROOT 1/);
      result = { suggestions: [
        { parent: A, level: "physical", text: "Wear ring clearance has opened up, adding to vibration and radial load at low flow",
          why: "Slurry wears the wear rings and the gap grows. A larger gap lets the impeller move more at the same flow.",
          confirmWith: "Measure wear ring clearance at the next teardown and compare with the maker's limit.", ruleOutWith: "Clearance is inside the limit and the rings show even wear.", deterioration: "natural" },
        { parent: B, level: "physical", text: "Slurry reaches the seal faces at start-up before the flush is flowing",
          why: "Seal faces scored and heat cracked suggest they ran dry or hot. A late flush at start-up would do that.",
          confirmWith: "Check the start-up sequence and flush flow reading at start; look for scoring on the inboard faces.", ruleOutWith: "Flush flow is steady before the pump turns and the damage is on the outboard face only.", deterioration: "forced" },
        { parent: B, level: "human", text: "Pump restarted after a rebuild without confirming the flush valve is fully open",
          why: "The evidence shows the flush valve part closed. Nothing in the job asks the fitter or operator to check it.",
          confirmWith: "Ask the last three fitters and operators how the flush valve position is checked.", ruleOutWith: "A signed check of the valve position exists for each rebuild.", deterioration: "forced" },
        { parent: R, level: "system", text: "No low-flow alarm or operating limit, so running at 60% of best efficiency flow looked normal",
          why: "Without a limit, throttling the valve is a normal way to match demand.",
          confirmWith: "Check the control system for an alarm or operating window on P-101.", ruleOutWith: "An operating window exists and operators were told to use it.", deterioration: "not_applicable" },
        { parent: R, level: "system", text: "Spares borrowed from P-102 stores are fitted without an inspection or test",
          why: "A borrowed seal or bearing set may already be marginal, so a repair could start with a short-life part.",
          confirmWith: "Look at the stores issue records and the condition of the last borrowed seal.", ruleOutWith: "Borrowed parts are inspected and logged before fitting.", deterioration: "not_applicable" },
      ] };
    } else if (feature === "challenge") {
      result = { summary: "The tree reaches system causes on every main branch, which is good. A few links rest on inference and one natural-wear question is open.",
        issues: [
          { ref: alias(/^B2\./), type: "no_evidence", severity: "medium", message: "B2 is explained by A1 and A2 only. No shaft deflection or runout reading is linked, so the movement is inferred, not shown.", question: "Was shaft runout or seal face movement measured at teardown?" },
          { ref: alias(/^ROOT 6/), type: "no_preventive", severity: "medium", message: "Repair coding has a new field, but nothing checks that the field is actually filled in.", question: "Who reviews the failure codes, and how often?" },
          { ref: "none", type: "no_preventive", severity: "low", message: "Forced wear is addressed. Natural wear of the bearings and seals will continue.", question: "What condition or interval triggers a planned change of bearings and seals?" },
        ] };
    } else if (feature === "capa") {
      result = { deterioration: "forced", deteriorationReason: "Running far from the best efficiency point is something we do, not natural wear. Fix the duty first; a shorter change interval would only hide it.",
        actions: [
          { kind: "preventive", category: "design", description: "Fit a trimmed or smaller impeller if the speed drive cannot hold the pump near its best efficiency point at current throughput.", intervalValue: 0, intervalUnit: "months", craft: "", rationale: "Matches the pump to its real duty instead of throttling." },
          { kind: "preventive", category: "maintenance_task", description: "Record discharge flow and valve position each week and compare with the pump curve.", intervalValue: 1, intervalUnit: "weeks", craft: "Process operator", rationale: "Starting point only: set the interval from how fast the duty changes." },
          { kind: "preventive", category: "spares", description: "Hold one spare impeller and wear ring set for P-101, minimum stock of one.", intervalValue: 0, intervalUnit: "months", craft: "", rationale: "Cuts repair time if the duty problem returns." },
          { kind: "preventive", category: "training", description: "Brief operators on why throttling the discharge valve damages seals and bearings.", intervalValue: 0, intervalUnit: "months", craft: "", rationale: "Supports the duty change so the new way of running holds." },
        ], horizontalExpansion: "Check P-102 and P-215 for the same throttling pattern and add them to the flow review." };
    } else if (feature === "draft") {
      result = { title: "Management summary: repeat seal and bearing failures on slurry pump P-101",
        sections: [
          { heading: "What happened", body: "Slurry pump P-101 failed six times in twelve months, three seals and three bearings. It has no standby, so each failure stopped the line for fourteen hours." },
          { heading: "What it cost", body: "$39,740 per failure and $238,440 a year, including 84 hours and 10,080 tonnes of lost production. Sample figures, illustrative." },
          { heading: "Why it happened", body: "The pump ran at about 60% of best efficiency flow, alignment after rebuilds was by straight edge, wash-down reached the bearings and the seal flush was restricted. Behind these are system causes: no duty review, no alignment standard, rebuild gaps and no verification." },
          { heading: "What we are doing", body: "- Run the pump near its best point on the speed drive.\n- Fit a flush flow indicator and add flush and oil to the inspection route.\n- Set an alignment standard and train fitters.\n- Hold a spare seal and bearing set." },
          { heading: "What we need from you", body: "Approval of $32,000 for the actions." },
          { heading: "How we will know it worked", body: "Review at 90 days and 12 months. A saving counts only once the failure is confirmed stopped." },
        ] };
    } else return route.continue();
    await new Promise((r) => setTimeout(r, 4000));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result, remainingToday: 12 }) });
  });
}

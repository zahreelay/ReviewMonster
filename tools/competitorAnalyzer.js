module.exports.analyzeCompetition = function (our, competitors) {
    const report = {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: []
    };

    for (const name in competitors) {
        const c = competitors[name];

        if (our.impact.ratingLift > c.impact.ratingLift) {
            report.strengths.push(`Higher rating improvement potential than ${name}`);
        } else {
            report.threats.push(`${name} improving faster than us`);
        }

        our.regressions.forEach(issue => {
            const rival = c.regressions.find(r => r.name === issue.name);
            if (rival && rival.trend === "regressing" && issue.trend !== "regressing") {
                report.strengths.push(`${issue.name} stabilizing while ${name} regresses`);
            }
        });
    }

    return report;
};

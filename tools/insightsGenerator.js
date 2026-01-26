/**
 * Insights Generator
 *
 * Processes analyzed reviews to generate structured insights:
 * - Issues with severity, first-seen, timeline
 * - Feature requests with demand ranking
 * - Strengths with frequency
 * - Rating history by month
 */

/**
 * Generate comprehensive insights from analyzed reviews
 * @param {Array} analyzedReviews - Reviews with analysis (intent, issues, summary)
 * @returns {Object} Structured insights
 */
function generateInsights(analyzedReviews) {
    if (!analyzedReviews || analyzedReviews.length === 0) {
        return {
            issues: [],
            requests: [],
            strengths: [],
            summary: {
                totalReviews: 0,
                avgRating: 0,
                sentiment: { positive: 0, neutral: 0, negative: 0 }
            }
        };
    }

    // Separate by intent
    const complaints = analyzedReviews.filter(r => r.intent === "complaint");
    const requests = analyzedReviews.filter(r => r.intent === "feature_request");
    const praises = analyzedReviews.filter(r => r.intent === "praise");

    // Generate issues with full details
    const issues = generateIssueDetails(complaints);

    // Generate feature requests with demand
    const featureRequests = generateRequestDetails(requests);

    // Generate strengths
    const strengths = generateStrengthDetails(praises);

    // Calculate summary metrics
    const totalReviews = analyzedReviews.length;
    const avgRating = analyzedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews;

    return {
        issues,
        requests: featureRequests,
        strengths,
        summary: {
            totalReviews,
            avgRating: parseFloat(avgRating.toFixed(2)),
            sentiment: {
                positive: praises.length,
                neutral: requests.length,
                negative: complaints.length
            }
        },
        generatedAt: new Date().toISOString()
    };
}

/**
 * Generate detailed issue analysis with improved impact scoring
 */
function generateIssueDetails(complaints) {
    const issueMap = {};

    for (const review of complaints) {
        if (!Array.isArray(review.issues)) continue;

        for (const issue of review.issues) {
            const key = normalizeIssueKey(issue);

            if (!issueMap[key]) {
                issueMap[key] = {
                    id: key,
                    title: formatIssueTitle(issue),
                    count: 0,
                    totalRating: 0,
                    reviews: [],
                    firstSeen: review.date,
                    lastSeen: review.date,
                    versions: new Set()
                };
            }

            issueMap[key].count++;
            issueMap[key].totalRating += review.rating || 0;
            issueMap[key].reviews.push({
                text: review.text,
                rating: review.rating,
                date: review.date,
                version: review.version,
                title: review.title
            });

            // Track first/last seen
            if (review.date < issueMap[key].firstSeen) {
                issueMap[key].firstSeen = review.date;
            }
            if (review.date > issueMap[key].lastSeen) {
                issueMap[key].lastSeen = review.date;
            }

            // Track versions
            if (review.version) {
                issueMap[key].versions.add(review.version);
            }
        }
    }

    // Total complaints for normalization
    const totalComplaints = complaints.length;

    // Convert to array and calculate impact scores
    return Object.values(issueMap)
        .map(issue => {
            const avgRating = issue.totalRating / issue.count;
            const impact = calculateImpactScore(issue, totalComplaints);

            return {
                id: issue.id,
                title: issue.title,
                severity: impact.severity,
                impactScore: impact.score,
                impactFactors: impact.factors,
                trend: impact.trend,
                count: issue.count,
                avgRating: parseFloat(avgRating.toFixed(2)),
                firstSeen: issue.firstSeen,
                lastSeen: issue.lastSeen,
                versions: Array.from(issue.versions),
                // Store only top 10 reviews as evidence
                evidence: issue.reviews.slice(0, 10)
            };
        })
        .sort((a, b) => {
            // Sort by impact score (higher = more important)
            return b.impactScore - a.impactScore;
        });
}

/**
 * Generate feature request details with improved demand scoring
 */
function generateRequestDetails(requests) {
    const requestMap = {};

    for (const review of requests) {
        if (!Array.isArray(review.issues)) continue;

        for (const request of review.issues) {
            const key = normalizeIssueKey(request);

            if (!requestMap[key]) {
                requestMap[key] = {
                    id: key,
                    title: formatIssueTitle(request),
                    count: 0,
                    reviews: [],
                    firstRequested: review.date
                };
            }

            requestMap[key].count++;
            requestMap[key].reviews.push({
                text: review.text,
                rating: review.rating,
                date: review.date
            });

            if (review.date < requestMap[key].firstRequested) {
                requestMap[key].firstRequested = review.date;
            }
        }
    }

    // Total requests for normalization
    const totalRequests = requests.length;

    return Object.values(requestMap)
        .map(request => {
            const demandInfo = calculateDemandScore(request, totalRequests);

            return {
                id: request.id,
                title: request.title,
                count: request.count,
                demand: demandInfo.demand,
                demandScore: demandInfo.score,
                demandFactors: demandInfo.factors,
                firstRequested: request.firstRequested,
                evidence: request.reviews.slice(0, 10)
            };
        })
        .sort((a, b) => b.demandScore - a.demandScore);
}

/**
 * Generate strength details
 */
function generateStrengthDetails(praises) {
    const strengthMap = {};

    for (const review of praises) {
        if (!Array.isArray(review.issues)) continue;

        for (const strength of review.issues) {
            const key = normalizeIssueKey(strength);

            if (!strengthMap[key]) {
                strengthMap[key] = {
                    id: key,
                    title: formatIssueTitle(strength),
                    count: 0,
                    reviews: []
                };
            }

            strengthMap[key].count++;
            strengthMap[key].reviews.push({
                text: review.text,
                rating: review.rating,
                date: review.date
            });
        }
    }

    return Object.values(strengthMap)
        .map(strength => ({
            id: strength.id,
            title: strength.title,
            count: strength.count,
            evidence: strength.reviews.slice(0, 10)
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Calculate impact score (0-100) for an issue
 * Factors: frequency, rating severity, recency, trend
 *
 * @param {Object} issue - Issue with count, reviews, avgRating, etc.
 * @param {number} totalComplaints - Total complaints for normalization
 * @returns {Object} { score: number, severity: string, factors: object }
 */
function calculateImpactScore(issue, totalComplaints) {
    const { count, reviews, totalRating } = issue;
    const avgRating = totalRating / count;

    // 1. Frequency factor (0-30 points)
    // Percentage of complaints mentioning this issue
    const frequencyPct = (count / Math.max(totalComplaints, 1)) * 100;
    const frequencyScore = Math.min(30, frequencyPct * 3); // Cap at 30

    // 2. Rating severity factor (0-30 points)
    // Lower avg rating = higher impact
    // 1★ = 30pts, 2★ = 22.5pts, 3★ = 15pts, 4★ = 7.5pts, 5★ = 0pts
    const ratingScore = Math.max(0, (5 - avgRating) * 7.5);

    // 3. Recency factor (0-25 points)
    // Weight reviews from last 30 days more heavily
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    let recentCount = 0;
    let moderateCount = 0;
    for (const review of reviews) {
        const reviewDate = new Date(review.date);
        if (reviewDate >= thirtyDaysAgo) {
            recentCount++;
        } else if (reviewDate >= ninetyDaysAgo) {
            moderateCount++;
        }
    }

    const recentPct = count > 0 ? (recentCount / count) * 100 : 0;
    const moderatePct = count > 0 ? (moderateCount / count) * 100 : 0;
    const recencyScore = Math.min(25, (recentPct * 0.2) + (moderatePct * 0.05));

    // 4. Trend factor (0-15 points)
    // Compare last 30 days vs previous 60 days
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
    let last30 = 0;
    let prev60 = 0;

    for (const review of reviews) {
        const reviewDate = new Date(review.date);
        if (reviewDate >= thirtyDaysAgo) {
            last30++;
        } else if (reviewDate >= sixtyDaysAgo) {
            prev60++;
        }
    }

    let trendScore = 0;
    let trend = "stable";
    if (prev60 > 0) {
        const trendRatio = last30 / (prev60 / 2); // Normalize to same period
        if (trendRatio > 2) {
            trendScore = 15;
            trend = "increasing";
        } else if (trendRatio > 1.5) {
            trendScore = 10;
            trend = "increasing";
        } else if (trendRatio > 1) {
            trendScore = 5;
            trend = "slightly_increasing";
        } else if (trendRatio < 0.5) {
            trendScore = 0;
            trend = "decreasing";
        }
    } else if (last30 > 0) {
        trendScore = 10; // New issue appearing
        trend = "new";
    }

    // Calculate total score
    const totalScore = Math.round(frequencyScore + ratingScore + recencyScore + trendScore);

    // Derive severity from score
    let severity;
    if (totalScore >= 70) {
        severity = "critical";
    } else if (totalScore >= 50) {
        severity = "high";
    } else if (totalScore >= 30) {
        severity = "medium";
    } else {
        severity = "low";
    }

    return {
        score: totalScore,
        severity,
        trend,
        factors: {
            frequency: Math.round(frequencyScore),
            ratingSeverity: Math.round(ratingScore),
            recency: Math.round(recencyScore),
            trend: Math.round(trendScore)
        }
    };
}

/**
 * Calculate demand score for feature requests (0-100)
 *
 * @param {Object} request - Request with count, reviews
 * @param {number} totalRequests - Total feature requests for normalization
 * @returns {Object} { score: number, demand: string }
 */
function calculateDemandScore(request, totalRequests) {
    const { count, reviews } = request;

    // 1. Frequency factor (0-50 points)
    const frequencyPct = (count / Math.max(totalRequests, 1)) * 100;
    const frequencyScore = Math.min(50, frequencyPct * 5);

    // 2. Recency factor (0-30 points)
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    let recentCount = 0;
    for (const review of reviews) {
        if (new Date(review.date) >= thirtyDaysAgo) {
            recentCount++;
        }
    }

    const recentPct = count > 0 ? (recentCount / count) * 100 : 0;
    const recencyScore = Math.min(30, recentPct * 0.3);

    // 3. Consistency factor (0-20 points)
    // Spread across multiple months = more consistent demand
    const monthsSet = new Set();
    for (const review of reviews) {
        if (review.date) {
            monthsSet.add(review.date.substring(0, 7));
        }
    }
    const consistencyScore = Math.min(20, monthsSet.size * 4);

    const totalScore = Math.round(frequencyScore + recencyScore + consistencyScore);

    let demand;
    if (totalScore >= 60) {
        demand = "high";
    } else if (totalScore >= 35) {
        demand = "medium";
    } else {
        demand = "low";
    }

    return {
        score: totalScore,
        demand,
        factors: {
            frequency: Math.round(frequencyScore),
            recency: Math.round(recencyScore),
            consistency: Math.round(consistencyScore)
        }
    };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateImpactScore instead
 */
function calculateSeverity(count, avgRating) {
    if (count >= 10 && avgRating < 2.5) return "critical";
    if (count >= 5 && avgRating < 3) return "high";
    if (count >= 3) return "medium";
    return "low";
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateDemandScore instead
 */
function calculateDemand(count) {
    if (count >= 20) return "high";
    if (count >= 10) return "medium";
    return "low";
}

/**
 * Normalize issue key for grouping
 */
function normalizeIssueKey(issue) {
    return String(issue)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
}

/**
 * Format issue title for display
 */
function formatIssueTitle(issue) {
    return String(issue)
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Generate rating history from reviews
 * @param {Array} reviews - Raw reviews with date and rating
 * @returns {Array} Monthly rating averages
 */
function generateRatingHistory(reviews) {
    if (!reviews || reviews.length === 0) return [];

    const monthlyData = {};

    for (const review of reviews) {
        if (!review.date || !review.rating) continue;

        const month = review.date.substring(0, 7); // YYYY-MM

        if (!monthlyData[month]) {
            monthlyData[month] = { total: 0, count: 0 };
        }

        monthlyData[month].total += review.rating;
        monthlyData[month].count++;
    }

    return Object.entries(monthlyData)
        .map(([month, data]) => ({
            month,
            avgRating: parseFloat((data.total / data.count).toFixed(2)),
            reviewCount: data.count
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Generate issue deep-dive analysis
 * @param {Object} issue - Issue from insights
 * @param {Array} allReviews - All analyzed reviews for context
 * @returns {Object} Detailed issue analysis
 */
function generateIssueDeepDive(issue, allReviews) {
    // Get all reviews mentioning this issue
    const relatedReviews = allReviews.filter(r => {
        if (!Array.isArray(r.issues)) return false;
        return r.issues.some(i => normalizeIssueKey(i) === issue.id);
    });

    // Build timeline
    const timeline = buildIssueTimeline(relatedReviews);

    // Calculate rating impact
    const otherReviews = allReviews.filter(r => {
        if (!Array.isArray(r.issues)) return true;
        return !r.issues.some(i => normalizeIssueKey(i) === issue.id);
    });

    const issueAvgRating = relatedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / relatedReviews.length;
    const otherAvgRating = otherReviews.length > 0
        ? otherReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / otherReviews.length
        : 0;

    const ratingImpact = parseFloat((issueAvgRating - otherAvgRating).toFixed(2));

    // Generate recommendations
    const recommendations = generateRecommendations(issue, timeline);

    return {
        issue: {
            id: issue.id,
            title: issue.title,
            severity: issue.severity,
            count: issue.count,
            avgRating: issue.avgRating
        },
        impact: {
            ratingDrop: ratingImpact,
            affectedReviews: relatedReviews.length,
            affectedPercentage: parseFloat(((relatedReviews.length / allReviews.length) * 100).toFixed(1)),
            trend: determineTrend(timeline)
        },
        timeline,
        recommendations,
        evidence: issue.evidence
    };
}

/**
 * Build timeline of issue occurrences
 */
function buildIssueTimeline(reviews) {
    const monthlyData = {};

    for (const review of reviews) {
        if (!review.date) continue;

        const month = review.date.substring(0, 7);
        const version = review.version || "unknown";

        if (!monthlyData[month]) {
            monthlyData[month] = {
                month,
                count: 0,
                versions: new Set()
            };
        }

        monthlyData[month].count++;
        monthlyData[month].versions.add(version);
    }

    return Object.values(monthlyData)
        .map(data => ({
            month: data.month,
            reportCount: data.count,
            versions: Array.from(data.versions)
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Determine issue trend
 */
function determineTrend(timeline) {
    if (timeline.length < 2) return "stable";

    const recent = timeline.slice(-3);
    const earlier = timeline.slice(0, -3);

    if (earlier.length === 0) return "new";

    const recentAvg = recent.reduce((sum, t) => sum + t.reportCount, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, t) => sum + t.reportCount, 0) / earlier.length;

    if (recentAvg > earlierAvg * 1.5) return "increasing";
    if (recentAvg < earlierAvg * 0.5) return "decreasing";
    return "stable";
}

/**
 * Generate recommendations for an issue
 */
function generateRecommendations(issue, timeline) {
    const recommendations = [];

    if (issue.severity === "critical") {
        recommendations.push("Immediate fix required - critical impact on user experience");
    }

    if (issue.count > 20) {
        recommendations.push("High volume of reports - prioritize in next sprint");
    }

    const trend = determineTrend(timeline);
    if (trend === "increasing") {
        recommendations.push("Issue reports are increasing - investigate recent changes");
    } else if (trend === "decreasing") {
        recommendations.push("Issue appears to be improving - verify fix is working");
    }

    if (issue.versions && issue.versions.length === 1) {
        recommendations.push(`Issue specific to version ${issue.versions[0]} - check release notes`);
    }

    if (recommendations.length === 0) {
        recommendations.push("Monitor for changes in future releases");
    }

    return recommendations;
}

module.exports = {
    generateInsights,
    generateRatingHistory,
    generateIssueDeepDive,
    normalizeIssueKey,
    calculateImpactScore,
    calculateDemandScore
};

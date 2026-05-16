import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller.js";

const router = Router();

// Analytics
router.get("/node-counts", analyticsController.getNodeCounts);
router.get("/similarity-distribution", analyticsController.getSimilarityDistribution);
router.get("/clusters", analyticsController.getClusters);
router.get("/students/:studentId/graph", analyticsController.getStudentGraph);
router.get("/top-pairs", analyticsController.getTopPairs);
router.get("/submissions/score-range", analyticsController.getByScoreRange);
router.get("/courses/:courseCode/report", analyticsController.getCourseReport);
router.get("/search", analyticsController.search);
router.get("/flagged-students", analyticsController.getFlaggedStudents);
router.get("/submissions/:submissionId/path", analyticsController.getSubmissionPath);
router.get("/graph-stats", analyticsController.getGraphStats);
router.get("/relationship-counts", analyticsController.getRelationshipTypeCounts);
router.get("/score-percentiles", analyticsController.getScorePercentiles);

// Paths
router.get("/shortest-path/:idA/:idB", analyticsController.getShortestPath);
router.get("/student-paths/:idA/:idB", analyticsController.getStudentPaths);
router.get("/submissions/:submissionId/chain", analyticsController.getSimilarityChain);
router.get("/centrality", analyticsController.getCentrality);
router.get("/connected-components", analyticsController.getConnectedComponents);
router.get("/path-stats", analyticsController.getPathStats);
router.get("/student-hubs", analyticsController.getStudentHubScores);

export default router;

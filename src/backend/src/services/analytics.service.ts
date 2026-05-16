import { analytics, paths } from "../graph/index.js";

export const analyticsService = {
  // Analytics
  getNodeCounts: analytics.getNodeCounts,
  getSimilarityDistribution: analytics.getSimilarityDistribution,
  detectPlagiarismClusters: analytics.detectPlagiarismClusters,
  getStudentSubmissionGraph: analytics.getStudentSubmissionGraph,
  getTopSimilarPairs: analytics.getTopSimilarPairs,
  getSubmissionsByScoreRange: analytics.getSubmissionsByScoreRange,
  getCourseSimilarityReport: analytics.getCourseSimilarityReport,
  searchNodes: analytics.searchNodes,
  getFlaggedStudents: analytics.getFlaggedStudents,
  getSubmissionPath: analytics.getSubmissionPath,
  getGraphStats: analytics.getGraphStats,
  getRelationshipTypeCounts: analytics.getRelationshipTypeCounts,
  getSubmissionScorePercentiles: analytics.getSubmissionScorePercentiles,

  // Paths
  findShortestPath: paths.findShortestPath,
  findAllStudentPaths: paths.findAllStudentPaths,
  getSimilarityChain: paths.getSimilarityChain,
  getSubmissionCentrality: paths.getSubmissionCentrality,
  detectConnectedComponents: paths.detectConnectedComponents,
  getPathStats: paths.getPathStats,
  getStudentHubScores: paths.getStudentHubScores,
};

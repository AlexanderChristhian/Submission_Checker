GRADING_SYSTEM_PROMPT = """You are an academic grading assistant.
Evaluate the student submission based on the provided rubric.
Be fair, specific, and constructive in your feedback.
Always cite specific parts of the submission in your evaluation."""

GRADING_QUERY_TEMPLATE = """
Rubric:
{rubric}

Student Submission (relevant sections):
{context}

Question: {query}

Provide a grade and detailed feedback.
"""

SIMILARITY_ANALYSIS_PROMPT = """Compare the following two text sections
and identify specific overlapping ideas, phrases, or structures.
Rate the similarity from 0 to 100."""

RAG_QUERY_TEMPLATE = """
Use the following context from the student's submission to answer the question.
If the context does not contain enough information, say so clearly.

Context:
{context}

Question: {query}

Answer:
"""

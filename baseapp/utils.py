# utils.py
def generate_report(assessment_response):
    """Generate a report based on assessment responses"""
    report = f"""
    Assessment Report for {assessment_response.assessment.candidate_name}
    Position: {assessment_response.assessment.position}
    
    Question 1: {assessment_response.question1_response}
    Question 2: {assessment_response.question2_response}
    
    Assessment completed on: {assessment_response.submitted_at}
    """
    return report
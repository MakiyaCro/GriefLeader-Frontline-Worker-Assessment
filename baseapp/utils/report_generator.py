from django.template.loader import render_to_string
from weasyprint import HTML, CSS
import os
from django.conf import settings
from datetime import datetime
import logging
from ..models import Attribute, AssessmentResponse
from pathlib import Path
import sys

# Add direct print statements for debugging
def get_benchmark_score_for_attribute(business, attribute):
    """Calculate benchmark score for a specific attribute"""
    benchmark_responses = AssessmentResponse.objects.filter(
        assessment__business=business,
        assessment__assessment_type='benchmark',
        assessment__completed=True
    )
    
    if not benchmark_responses.exists():
        return None
        
    total_score = 0
    responses = 0
    
    for response in benchmark_responses:
        score = response.get_score_for_attribute(attribute)
        if score is not None:
            total_score += score
            responses += 1
    
    return (total_score / responses) if responses > 0 else None

def generate_assessment_report(assessment_response):
    """
    Generate assessment report using HTML template and WeasyPrint.
    """
    try:
        # Get assessment data
        assessment = assessment_response.assessment
        
        completion_time = assessment_response.submitted_at - assessment.created_at
        
        # Get all attributes and print them
        attributes = Attribute.objects.filter(
            business=assessment.business,
            active=True
        ).order_by('order')
        
        # Initialize scores dictionary
        scores = {
            'integrity': {'candidate_score': 'N/A', 'benchmark_score': 'N/A'},
            'safety': {'candidate_score': 'N/A', 'benchmark_score': 'N/A'},
            'work_ethic': {'candidate_score': 'N/A', 'benchmark_score': 'N/A'},
            'teamwork': {'candidate_score': 'N/A', 'benchmark_score': 'N/A'},
            'customer_service': {'candidate_score': 'N/A', 'benchmark_score': 'N/A'},
            'goal_orientation': {'candidate_score': 'N/A', 'benchmark_score': 'N/A'},
            'learning_agility': {'candidate_score': 'N/A', 'benchmark_score': 'N/A'},
            'conflict_resolution': {'candidate_score': 'N/A', 'benchmark_score': 'N/A'},
            'self_awareness': {'candidate_score': 'N/A', 'benchmark_score': 'N/A'},
            'emotional_stability': {'candidate_score': 'N/A', 'benchmark_score': 'N/A'},
            'ambition': {'candidate_score': 'N/A', 'benchmark_score': 'N/A'},
        }
        
        # Calculate scores for each attribute
        for attribute in attributes:
            original_name = attribute.name
            normalized_name = attribute.name.lower().replace('/', '_').replace(' ', '_').replace('-', '_')
            
            candidate_score = assessment_response.get_score_for_attribute(attribute)
            benchmark_score = get_benchmark_score_for_attribute(assessment.business, attribute)
            
            # Try to find a matching score key
            matched_key = None
            for score_key in scores.keys():
                if score_key in normalized_name or normalized_name in score_key:
                    matched_key = score_key
                    break
            
            if matched_key:
                scores[matched_key] = {
                    'candidate_score': f"{candidate_score:.1f}%" if candidate_score is not None else "N/A",
                    'benchmark_score': f"{benchmark_score:.1f}%" if benchmark_score is not None else "N/A"
                }
            else:
                print(f"WARNING: No match found for {original_name}")
                print(f"Available keys: {list(scores.keys())}")
        
        # Prepare context
        context = {
            'candidate_name': assessment.candidate_name,
            'position': assessment.position,
            'submitted_at': assessment_response.submitted_at.strftime('%Y-%m-%d'),
            'completion_time': str(completion_time).split('.')[0],
            'manager_name': assessment.manager_name,
            'region': assessment.region,
            'scores': scores,
        }
        
        # Setup output paths
        reports_dir = os.path.join(settings.MEDIA_ROOT, 'assessment_reports')
        os.makedirs(reports_dir, exist_ok=True)
        output_path = os.path.join(reports_dir, f'assessment_report_{assessment.unique_link}.pdf')
        
        # Get CSS
        css_path = os.path.join(settings.STATIC_ROOT, 'css', 'assessment_report.css')
        if not os.path.exists(css_path):
            css_path = os.path.join(settings.BASE_DIR, 'baseapp', 'static', 'css', 'assessment_report.css')
        
        with open(css_path, 'r', encoding='utf-8') as css_file:
            css_string = css_file.read()
        
        # Create temporary HTML file
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False, mode='w', encoding='utf-8') as tmp_html:
            # Render template
            html_string = render_to_string('baseapp/assessment_report.html', context)
            tmp_html.write(html_string)
            tmp_html_path = tmp_html.name
        
        try:
            # Generate PDF
            html = HTML(filename=tmp_html_path, base_url=str(settings.BASE_DIR))
            css = CSS(string=css_string)
            
            html.write_pdf(
                output_path,
                stylesheets=[css]
            )
            
            return output_path
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_html_path):
                os.unlink(tmp_html_path)
        
    except Exception as e:
        print(f"\nERROR in generate_assessment_report: {str(e)}")
        print(f"Python version: {sys.version}")
        print(f"Current working directory: {os.getcwd()}")
        raise
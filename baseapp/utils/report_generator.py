from django.template.loader import render_to_string
from weasyprint import HTML, CSS
import os
from django.conf import settings
from datetime import datetime
import logging
from ..models import Attribute, AssessmentResponse
from pathlib import Path
import sys
import base64
import requests
from io import BytesIO
from django.core.cache import cache
import tempfile

logger = logging.getLogger(__name__)

def get_benchmark_scores_for_business(business):
    """
    Get all benchmark scores for a business in one efficient query
    Returns a dictionary of attribute_id -> score
    """
    # Create a cache key for benchmark scores
    cache_key = f'benchmark_scores_{business.id}'
    
    # Check if we have cached benchmark scores
    cached_scores = cache.get(cache_key)
    if cached_scores is not None:
        logger.info(f"Using cached benchmark scores for business {business.id}")
        return cached_scores
    
    logger.info(f"Calculating benchmark scores for business {business.id}")
    
    # Get all assessment responses and related data in one query
    benchmark_responses = AssessmentResponse.objects.filter(
        assessment__business=business,
        assessment__assessment_type='benchmark',
        assessment__completed=True
    ).select_related('assessment')
    
    # If no benchmark responses, return empty dictionary
    if not benchmark_responses.exists():
        logger.info(f"No benchmark responses found for business {business.id}")
        # Cache empty results for a shorter time (1 hour)
        cache.set(cache_key, {}, 3600)
        return {}
    
    # Get all attributes for this business
    attributes = Attribute.objects.filter(business=business, active=True)
    
    # Initialize scores dictionary
    benchmark_scores = {}
    
    # Calculate scores for each attribute
    for attribute in attributes:
        total_score = 0
        responses = 0
        
        for response in benchmark_responses:
            score = response.get_score_for_attribute(attribute)
            if score is not None:
                total_score += score
                responses += 1
        
        if responses > 0:
            benchmark_scores[attribute.id] = total_score / responses
    
    # Cache the scores for 24 hours (or use BENCHMARK_CACHE_TIMEOUT setting)
    timeout = getattr(settings, 'BENCHMARK_CACHE_TIMEOUT', 86400)
    cache.set(cache_key, benchmark_scores, timeout)
    
    return benchmark_scores


def get_logo_base64(logo_field):
    """
    Convert a logo file to base64 for embedding directly in HTML.
    This avoids path resolution issues in WeasyPrint.
    """
    if not logo_field:
        return None
    
    # Create a cache key for the logo
    cache_key = f'logo_base64_{logo_field.name}'
    
    # Check if we have a cached version
    cached_logo = cache.get(cache_key)
    if cached_logo is not None:
        return cached_logo
    
    try:
        # Get the URL
        url = logo_field.url
        
        # For Cloudinary URLs, fetch the image content
        if url.startswith('http'):
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                image_content = response.content
                # Determine content type from the URL or response headers
                content_type = response.headers.get('Content-Type', 'image/png')
            else:
                print(f"Failed to fetch logo from URL: {url}, status: {response.status_code}")
                return None
        else:
            # For local files, read the file content
            try:
                # If it's a relative URL, convert to absolute path
                if url.startswith('/media/'):
                    file_path = os.path.join(settings.MEDIA_ROOT, url.replace('/media/', ''))
                else:
                    file_path = os.path.join(settings.BASE_DIR, url.lstrip('/'))
                
                # Read the file
                with open(file_path, 'rb') as f:
                    image_content = f.read()
                
                # Determine content type from file extension
                ext = os.path.splitext(file_path)[1].lower()
                content_types = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml'
                }
                content_type = content_types.get(ext, 'image/png')
            except Exception as e:
                print(f"Error reading logo file: {str(e)}")
                return None
        
        # Encode the image content as base64
        encoded = base64.b64encode(image_content).decode('utf-8')
        data_url = f"data:{content_type};base64,{encoded}"
        
        # Cache the data URL for 24 hours (logos rarely change)
        cache.set(cache_key, data_url, 86400)
        
        return data_url
        
    except Exception as e:
        print(f"Error processing logo: {str(e)}")
        return None


def generate_assessment_report(assessment_response, force_refresh=False):
    """
    Generate assessment report using HTML template and WeasyPrint.
    Added caching to reduce database queries.
    
    Args:
        assessment_response: The AssessmentResponse object
        force_refresh: Whether to force regeneration even if cached report exists
    
    Returns:
        Path to the generated PDF file
    """
    # Get assessment and business
    assessment = assessment_response.assessment
    business = assessment.business
    
    # Create a cache key for this specific report
    cache_key = f'assessment_report_{assessment.id}'
    
    # Use TEMP_REPORT_DIR if defined, otherwise use default
    report_dir = getattr(settings, 'TEMP_REPORT_DIR', os.path.join(settings.MEDIA_ROOT, 'assessment_reports'))
    os.makedirs(report_dir, exist_ok=True)
    
    # Define the destination file path
    pdf_filename = f'assessment_report_{assessment.unique_link}.pdf'
    pdf_path = os.path.join(report_dir, pdf_filename)
    
    # Check if the file already exists and we're not forcing a refresh
    if not force_refresh and os.path.exists(pdf_path):
        logger.info(f"Using existing PDF report for assessment {assessment.id}")
        return pdf_path
    
    # Check if we're currently generating this report (to prevent concurrent generation)
    if not force_refresh and cache.get(f"{cache_key}_generating"):
        logger.info(f"Report generation already in progress for assessment {assessment.id}")
        # Wait for existing generation to complete by checking for file
        import time
        max_wait = 30  # Maximum wait time in seconds
        for _ in range(max_wait):
            if os.path.exists(pdf_path):
                return pdf_path
            time.sleep(1)
        
        # If we get here, something went wrong with the other process
        logger.warning(f"Timed out waiting for report generation for assessment {assessment.id}")
    
    try:
        # Set a flag to indicate we're generating this report
        cache.set(f"{cache_key}_generating", True, 300)  # 5 minute timeout
        
        # Calculate completion time
        completion_time = assessment_response.submitted_at - assessment.created_at
        
        # Get all attributes in one efficient query
        attributes = list(Attribute.objects.filter(
            business=business,
            active=True
        ).order_by('order'))
        
        # Get all benchmark scores in one query instead of per attribute
        benchmark_scores = get_benchmark_scores_for_business(business)
        
        # Initialize scores dictionary with the same structure as your original function
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
        
        # Calculate scores for each attribute efficiently
        for attribute in attributes:
            original_name = attribute.name
            normalized_name = attribute.name.lower().replace('/', '_').replace(' ', '_').replace('-', '_')
            
            # Get candidate score for this attribute
            candidate_score = assessment_response.get_score_for_attribute(attribute)
            
            # Get benchmark score from our pre-calculated dictionary
            benchmark_score = benchmark_scores.get(attribute.id)
            
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
                logger.warning(f"No match found for {original_name}")
                logger.debug(f"Available keys: {list(scores.keys())}")
        
        # Get business logo as base64 data URL - this is now cached
        business_logo = get_logo_base64(business.logo) if business.logo else None
        logger.info(f"Business logo processed: {'Yes' if business_logo else 'No'}")
        
        # Prepare context with business branding
        context = {
            # Candidate info
            'candidate_name': assessment.candidate_name,
            'position': assessment.position,
            'submitted_at': assessment_response.submitted_at.strftime('%Y-%m-%d'),
            'completion_time': str(completion_time).split('.')[0],
            'manager_name': assessment.manager_name,
            'region': assessment.region,
            'scores': scores,
            
            # Business branding
            'business_name': business.name,
            'business_color': business.primary_color or "#0066cc",
            'business_logo': business_logo,
            'business_tagline': "Candidate Assessment",
            'business_phone': "",  # You can add a phone field to the Business model if needed
        }
        
        logger.info(f"Report context - Business name: {context['business_name']}")
        
        # Get CSS path
        css_path = os.path.join(settings.STATIC_ROOT, 'css', 'assessment_report.css')
        if not os.path.exists(css_path):
            css_path = os.path.join(settings.BASE_DIR, 'baseapp', 'static', 'css', 'assessment_report.css')
        
        # Read CSS
        with open(css_path, 'r', encoding='utf-8') as css_file:
            css_string = css_file.read()
        
        # Create temporary HTML file
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False, mode='w', encoding='utf-8') as tmp_html:
            # Render template
            html_string = render_to_string('baseapp/assessment_report.html', context)
            tmp_html.write(html_string)
            tmp_html_path = tmp_html.name
        
        try:
            # Generate PDF
            html = HTML(filename=tmp_html_path)
            css = CSS(string=css_string)
            
            # Create temp file for PDF to avoid permission issues on Heroku
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_pdf:
                temp_pdf_path = temp_pdf.name
            
            # Write to temp file first
            html.write_pdf(
                temp_pdf_path,
                stylesheets=[css]
            )
            
            # Copy to final destination
            import shutil
            shutil.copy2(temp_pdf_path, pdf_path)
            
            # Remove temp PDF file
            if os.path.exists(temp_pdf_path):
                os.unlink(temp_pdf_path)
            
            # Clear the generating flag
            cache.delete(f"{cache_key}_generating")
            
            return pdf_path
            
        finally:
            # Clean up temporary HTML file
            if os.path.exists(tmp_html_path):
                os.unlink(tmp_html_path)
        
    except Exception as e:
        # Clear the generating flag on error
        cache.delete(f"{cache_key}_generating")
        
        logger.error(f"ERROR in generate_assessment_report: {str(e)}")
        logger.error(f"Python version: {sys.version}")
        logger.error(f"Current working directory: {os.getcwd()}")
        
        # Re-raise the exception
        raise
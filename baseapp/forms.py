from django import forms
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from .models import Assessment, AssessmentResponse, QuestionResponse, Business, BenchmarkBatch, Attribute, QuestionPair, CustomUser

class BusinessForm(forms.ModelForm):
    """Form for creating and editing businesses"""
    class Meta:
        model = Business
        fields = ['name', 'logo', 'primary_color']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'logo': forms.FileInput(attrs={'class': 'form-control'}),
            'primary_color': forms.TextInput(attrs={
                'class': 'form-control',
                'type': 'color'
            })
        }

class AssessmentCreationForm(forms.ModelForm):
    """Form for HR users to create new assessments"""
    class Meta:
        model = Assessment
        fields = [
            'candidate_name', 
            'candidate_email', 
            'position',
            'region', 
            'manager_name', 
            'manager_email'
        ]
        widgets = {
            'candidate_name': forms.TextInput(attrs={'class': 'form-control'}),
            'candidate_email': forms.EmailInput(attrs={'class': 'form-control'}),
            'position': forms.TextInput(attrs={'class': 'form-control'}),
            'region': forms.TextInput(attrs={'class': 'form-control'}),
            'manager_name': forms.TextInput(attrs={'class': 'form-control'}),
            'manager_email': forms.EmailInput(attrs={'class': 'form-control'})
        }

    def __init__(self, *args, **kwargs):
        # Accept business parameter, defaulting to None
        business = kwargs.pop('business', None)
        super().__init__(*args, **kwargs)
        self.business = business

    def clean_candidate_email(self):
        email = self.cleaned_data['candidate_email']
        # Only perform check if business is set
        if self.business and Assessment.objects.filter(
            candidate_email=email,
            completed=False,
            business=self.business
        ).exists():
            raise ValidationError('This candidate already has an active assessment in your organization.')
        return email

class BenchmarkBatchForm(forms.ModelForm):
    """Form for creating benchmark assessment batches"""
    class Meta:
        model = BenchmarkBatch
        fields = ['name', 'data_file']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'data_file': forms.FileInput(attrs={'class': 'form-control'})
        }
        help_texts = {
            'data_file': 'Upload an Excel (.xlsx, .xls) or CSV file with columns: name, email'
        }

    def clean_data_file(self):
        data_file = self.cleaned_data['data_file']
        
        # Validate file extension
        valid_extensions = ['.xlsx', '.xls', '.csv']
        ext = str(data_file.name).lower()[-4:]
        if ext not in valid_extensions:
            raise ValidationError('Invalid file format. Please upload an Excel or CSV file.')
        
        # Validate file size (max 5MB)
        if data_file.size > 5 * 1024 * 1024:
            raise ValidationError('File size must be under 5MB.')
            
        return data_file

class AssessmentResponseForm(forms.Form):
    """Form for candidates to complete their assessment"""
    
    def __init__(self, *args, **kwargs):
        question_pairs = kwargs.pop('question_pairs', [])
        super().__init__(*args, **kwargs)
        
        for index, pair in enumerate(question_pairs, start=1):
            field_name = f'question_{pair.id}'
            self.fields[field_name] = forms.ChoiceField(
                choices=[
                    ('A', pair.statement_a),
                    ('B', pair.statement_b)
                ],
                widget=forms.RadioSelect(attrs={
                    'class': 'form-check-input',
                    'required': True,
                    'data-question-id': pair.id
                }),
                label=f'Statement Pairing {index}',  # Generic labeling
                required=True,
                error_messages={
                    'required': 'Please select an answer for this question.'
                }
            )
    
    def clean(self):
        cleaned_data = super().clean()
        unanswered = []
        
        for field_name in self.fields:
            if field_name not in cleaned_data:
                unanswered.append(field_name.replace('question_', ''))
        
        if unanswered:
            raise ValidationError(
                'Please answer all questions before submitting. '
                f'Missing answers for questions: {", ".join(unanswered)}'
            )
        
        return cleaned_data

class AttributeForm(forms.ModelForm):
    """Form for creating and editing attributes"""
    class Meta:
        model = Attribute
        fields = ['name', 'description', 'order', 'active']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'order': forms.NumberInput(attrs={'class': 'form-control'}),
            'active': forms.CheckboxInput(attrs={'class': 'form-check-input'})
        }

class QuestionPairForm(forms.ModelForm):
    """Form for creating and editing question pairs"""
    class Meta:
        model = QuestionPair
        fields = ['attribute1', 'attribute2', 'statement_a', 'statement_b', 'order', 'active']
        widgets = {
            'attribute1': forms.Select(attrs={'class': 'form-control'}),
            'attribute2': forms.Select(attrs={'class': 'form-control'}),
            'statement_a': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'statement_b': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'order': forms.NumberInput(attrs={'class': 'form-control'}),
            'active': forms.CheckboxInput(attrs={'class': 'form-check-input'})
        }

    def __init__(self, *args, **kwargs):
        business = kwargs.pop('business', None)
        super().__init__(*args, **kwargs)
        if business:
            self.fields['attribute1'].queryset = Attribute.objects.filter(business=business)
            self.fields['attribute2'].queryset = Attribute.objects.filter(business=business)

    def clean(self):
        cleaned_data = super().clean()
        attr1 = cleaned_data.get('attribute1')
        attr2 = cleaned_data.get('attribute2')
        
        if attr1 and attr2 and attr1 == attr2:
            raise ValidationError('Cannot compare an attribute with itself.')
            
        return cleaned_data

class LoginForm(forms.Form):
    """Form for user login"""
    username = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control'}),
        max_length=150
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control'})
    )

class PasswordResetForm(forms.Form):
    email = forms.EmailField(
        label="Email",
        max_length=254,
        widget=forms.EmailInput(attrs={'class': 'form-control'})
    )

    def clean_email(self):
        email = self.cleaned_data['email']
        if not CustomUser.objects.filter(email=email).exists():
            raise ValidationError("No account found with this email address. Please contact site admin")
        return email
    
class SetNewPasswordForm(forms.Form):
    password1 = forms.CharField(
        label="New Password",
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
        help_text="Password must be at least 8 characters and contain letters, numbers, and special characters."
    )
    password2 = forms.CharField(
        label="Confirm New Password",
        widget=forms.PasswordInput(attrs={'class': 'form-control'})
    )

    def clean_password1(self):
        password1 = self.cleaned_data.get('password1')
        try:
            validate_password(password1)
        except ValidationError as e:
            raise ValidationError(list(e.messages))
        return password1

    def clean(self):
        cleaned_data = super().clean()
        password1 = cleaned_data.get('password1')
        password2 = cleaned_data.get('password2')

        if password1 and password2 and password1 != password2:
            raise ValidationError("The two password fields didn't match.")
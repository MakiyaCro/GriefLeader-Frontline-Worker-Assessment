# baseapp/management/commands/import_questions.py
from django.core.management.base import BaseCommand
from baseapp.models import Attribute, QuestionPair

class Command(BaseCommand):
    help = 'Import initial attributes and question pairs'

    def handle(self, *args, **kwargs):
        # First, create all attributes
        attributes = [
            "Integrity/Accountability",
            "Safety",
            "Work Ethic",
            "Teamwork",
            "Customer Service",
            "Goal Orientation",
            "Learning Agility",
            "Conflict Resolution",
            "Self-Awareness",
            "Emotional Stability/Moodiness",
            "Ambition"
        ]
        
        # Dictionary to store attribute objects
        attribute_objects = {}
        
        # Create attributes
        for order, attr_name in enumerate(attributes, 1):
            attr, created = Attribute.objects.get_or_create(
                name=attr_name,
                defaults={'order': order}
            )
            attribute_objects[attr_name] = attr
            if created:
                self.stdout.write(f'Created attribute: {attr_name}')
            else:
                self.stdout.write(f'Found existing attribute: {attr_name}')

        # Question pairs data
        questions = [
    # 1-10: Integrity/Accountability vs others
    {
        'attr1': "Integrity/Accountability",
        'attr2': "Safety",
        'statement_a': "I always fulfill my commitments honestly and ethically.",
        'statement_b': "I take proactive steps to ensure a safe work environment."
    },
    {
        'attr1': "Integrity/Accountability",
        'attr2': "Work Ethic",
        'statement_a': "I take responsibility for my actions, even in difficult situations.",
        'statement_b': "I consistently put in the effort needed to get the job done."
    },
    {
        'attr1': "Integrity/Accountability",
        'attr2': "Teamwork",
        'statement_a': "I prioritize honesty and accountability in all interactions.",
        'statement_b': "I focus on creating a collaborative and supportive team dynamic."
    },
    {
        'attr1': "Integrity/Accountability",
        'attr2': "Customer Service",
        'statement_a': "I adhere to my ethical principles in all customer interactions.",
        'statement_b': "I strive to go above and beyond to ensure customer satisfaction."
    },
    {
        'attr1': "Integrity/Accountability",
        'attr2': "Goal Orientation",
        'statement_a': "I maintain my integrity while working toward my goals.",
        'statement_b': "I set ambitious targets and work diligently to achieve them."
    },
    {
        'attr1': "Integrity/Accountability",
        'attr2': "Learning Agility",
        'statement_a': "I hold myself accountable for improving my skills and knowledge.",
        'statement_b': "I adapt quickly to new challenges and learning opportunities."
    },
    {
        'attr1': "Integrity/Accountability",
        'attr2': "Conflict Resolution",
        'statement_a': "I address conflicts with honesty and fairness.",
        'statement_b': "I focus on resolving disagreements in a constructive way."
    },
    {
        'attr1': "Integrity/Accountability",
        'attr2': "Self-Awareness",
        'statement_a': "I take ownership of my decisions and their consequences.",
        'statement_b': "I reflect on how my actions and behavior impact others."
    },
    {
        'attr1': "Integrity/Accountability",
        'attr2': "Emotional Stability/Moodiness",
        'statement_a': "I remain consistent in my values, even under pressure.",
        'statement_b': "I stay calm and composed during stressful situations."
    },
    {
        'attr1': "Integrity/Accountability",
        'attr2': "Ambition",
        'statement_a': "I prioritize acting ethically, even if it slows my progress.",
        'statement_b': "I am driven to achieve success and recognition in my career."
    },

    # 11-19: Safety vs others
    {
        'attr1': "Safety",
        'attr2': "Work Ethic",
        'statement_a': "I am vigilant about identifying and addressing safety risks.",
        'statement_b': "I am dedicated to delivering high-quality results consistently."
    },
    {
        'attr1': "Safety",
        'attr2': "Teamwork",
        'statement_a': "I promote safety to protect everyone on the team.",
        'statement_b': "I contribute to a positive and cooperative team environment."
    },
    {
        'attr1': "Safety",
        'attr2': "Customer Service",
        'statement_a': "I ensure safety standards are followed to benefit all stakeholders.",
        'statement_b': "I prioritize creating a great experience for customers."
    },
    {
        'attr1': "Safety",
        'attr2': "Goal Orientation",
        'statement_a': "I prioritize safety over reaching goals too quickly.",
        'statement_b': "I am focused on setting and achieving ambitious goals."
    },
    {
        'attr1': "Safety",
        'attr2': "Learning Agility",
        'statement_a': "I ensure safety protocols are adhered to in new situations.",
        'statement_b': "I adapt quickly to changes and learn from new experiences."
    },
    {
        'attr1': "Safety",
        'attr2': "Conflict Resolution",
        'statement_a': "I address safety concerns in any conflicts that arise.",
        'statement_b': "I work to find fair and equitable solutions to workplace disputes."
    },
    {
        'attr1': "Safety",
        'attr2': "Self-Awareness",
        'statement_a': "I am mindful of how my actions impact workplace safety.",
        'statement_b': "I reflect on my own behavior to improve my performance."
    },
    {
        'attr1': "Safety",
        'attr2': "Emotional Stability/Moodiness",
        'statement_a': "I maintain a strong focus on safety, even under stress.",
        'statement_b': "I stay calm and composed when handling stressful situations."
    },
    {
        'attr1': "Safety",
        'attr2': "Ambition",
        'statement_a': "I prioritize safety over personal or career advancement.",
        'statement_b': "I am motivated to achieve ambitious goals in my career."
    },

    # 20-27: Work Ethic vs others
    {
        'attr1': "Work Ethic",
        'attr2': "Teamwork",
        'statement_a': "I consistently strive to deliver my best work.",
        'statement_b': "I enjoy collaborating with others to achieve shared goals."
    },
    {
        'attr1': "Work Ethic",
        'attr2': "Customer Service",
        'statement_a': "I am willing to go the extra mile to complete tasks effectively.",
        'statement_b': "I focus on ensuring customers are satisfied with their experience."
    },
    {
        'attr1': "Work Ethic",
        'attr2': "Goal Orientation",
        'statement_a': "I put consistent effort into everything I do, regardless of difficulty.",
        'statement_b': "I am motivated by achieving specific and measurable goals."
    },
    {
        'attr1': "Work Ethic",
        'attr2': "Learning Agility",
        'statement_a': "I maintain a strong work ethic, even when tasks are unfamiliar.",
        'statement_b': "I quickly adapt to new challenges and approaches to improve results."
    },
    {
        'attr1': "Work Ethic",
        'attr2': "Conflict Resolution",
        'statement_a': "I focus on maintaining productivity, even during workplace disputes.",
        'statement_b': "I work to resolve disagreements constructively and fairly."
    },
    {
        'attr1': "Work Ethic",
        'attr2': "Self-Awareness",
        'statement_a': "I pride myself on delivering consistent, high-quality work.",
        'statement_b': "I reflect on my behavior to understand its impact on my performance."
    },
    {
        'attr1': "Work Ethic",
        'attr2': "Emotional Stability/Moodiness",
        'statement_a': "I stay focused on my tasks, even when under pressure.",
        'statement_b': "I maintain emotional balance during challenging situations."
    },
    {
        'attr1': "Work Ethic",
        'attr2': "Ambition",
        'statement_a': "I work hard to ensure the quality of my output is always high.",
        'statement_b': "I aim for career advancement and strive to exceed expectations."
    },

    # 28-34: Teamwork vs others
    {
        'attr1': "Teamwork",
        'attr2': "Customer Service",
        'statement_a': "I collaborate effectively to ensure team success.",
        'statement_b': "I focus on creating positive experiences for customers."
    },
    {
        'attr1': "Teamwork",
        'attr2': "Goal Orientation",
        'statement_a': "I prioritize building strong team dynamics to achieve goals.",
        'statement_b': "I am driven to accomplish my individual objectives."
    },
    {
        'attr1': "Teamwork",
        'attr2': "Learning Agility",
        'statement_a': "I enjoy working with others to solve problems collectively.",
        'statement_b': "I adapt quickly to new environments and processes."
    },
    {
        'attr1': "Teamwork",
        'attr2': "Conflict Resolution",
        'statement_a': "I foster collaboration to maintain harmony in the workplace.",
        'statement_b': "I address conflicts directly to find equitable solutions."
    },
    {
        'attr1': "Teamwork",
        'attr2': "Self-Awareness",
        'statement_a': "I focus on ensuring my contributions benefit the team.",
        'statement_b': "I reflect on how my actions influence the group dynamic."
    },
    {
        'attr1': "Teamwork",
        'attr2': "Emotional Stability/Moodiness",
        'statement_a': "I stay focused on team goals, even under stressful circumstances.",
        'statement_b': "I remain calm and composed when dealing with challenges."
    },
    {
        'attr1': "Teamwork",
        'attr2': "Ambition",
        'statement_a': "I prioritize team success over individual recognition.",
        'statement_b': "I am driven to excel and achieve personal career milestones."
    },

    # 35-40: Customer Service vs others
    {
        'attr1': "Customer Service",
        'attr2': "Goal Orientation",
        'statement_a': "I prioritize customer satisfaction above all else.",
        'statement_b': "I set clear goals and work tirelessly to achieve them."
    },
    {
        'attr1': "Customer Service",
        'attr2': "Learning Agility",
        'statement_a': "I adapt my approach to meet the specific needs of each customer.",
        'statement_b': "I embrace new challenges and quickly learn to improve my skills."
    },
    {
        'attr1': "Customer Service",
        'attr2': "Conflict Resolution",
        'statement_a': "I handle customer concerns with patience and professionalism.",
        'statement_b': "I focus on finding fair resolutions to workplace conflicts."
    },
    {
        'attr1': "Customer Service",
        'attr2': "Self-Awareness",
        'statement_a': "I think about how my actions influence customer satisfaction.",
        'statement_b': "I evaluate my behavior to improve my professional relationships."
    },
    {
        'attr1': "Customer Service",
        'attr2': "Emotional Stability/Moodiness",
        'statement_a': "I remain professional with customers, even in difficult situations.",
        'statement_b': "I keep my emotions under control during stressful interactions."
    },
    {
        'attr1': "Customer Service",
        'attr2': "Ambition",
        'statement_a': "I prioritize ensuring customer needs are met above personal goals.",
        'statement_b': "I am motivated to advance in my career and achieve recognition."
    },

    # 41-45: Goal Orientation vs others
    {
        'attr1': "Goal Orientation",
        'attr2': "Learning Agility",
        'statement_a': "I focus on setting and achieving measurable objectives.",
        'statement_b': "I adapt quickly to new tasks and learn from every experience."
    },
    {
        'attr1': "Goal Orientation",
        'attr2': "Conflict Resolution",
        'statement_a': "I stay focused on my goals while addressing workplace challenges.",
        'statement_b': "I work to resolve disagreements in a constructive manner."
    },
    {
        'attr1': "Goal Orientation",
        'attr2': "Self-Awareness",
        'statement_a': "I prioritize accomplishing my personal and professional goals.",
        'statement_b': "I reflect on how my actions align with my values and goals."
    },
    {
        'attr1': "Goal Orientation",
        'attr2': "Emotional Stability/Moodiness",
        'statement_a': "I remain determined to achieve my goals, even under pressure.",
        'statement_b': "I stay calm and level-headed when dealing with unexpected stress."
    },
    {
        'attr1': "Goal Orientation",
        'attr2': "Ambition",
        'statement_a': "I work hard to achieve specific goals I set for myself.",
        'statement_b': "I aim to advance my career and achieve personal recognition."
    },

    # 46-49: Learning Agility vs others
    {
        'attr1': "Learning Agility",
        'attr2': "Conflict Resolution",
        'statement_a': "I adapt quickly to new challenges and approaches.",
        'statement_b': "I work to mediate and resolve disagreements effectively."
    },
    {
        'attr1': "Learning Agility",
        'attr2': "Self-Awareness",
        'statement_a': "I embrace new opportunities to learn and grow.",
        'statement_b': "I regularly assess how my actions impact those around me."
    },
    {
        'attr1': "Learning Agility",
        'attr2': "Emotional Stability/Moodiness",
        'statement_a': "I handle change with a positive and adaptable mindset.",
        'statement_b': "I stay calm and resilient when faced with unexpected challenges."
    },
    {
        'attr1': "Learning Agility",
        'attr2': "Ambition",
        'statement_a': "I focus on learning and growing from every experience.",
        'statement_b': "I am driven to achieve success and advance my career."
    },

    # 50-52: Conflict Resolution vs others
    {
        'attr1': "Conflict Resolution",
        'attr2': "Self-Awareness",
        'statement_a': "I strive to resolve conflicts fairly and constructively.",
        'statement_b': "I reflect on how my actions contribute to disagreements."
    },
    {
        'attr1': "Conflict Resolution",
        'attr2': "Emotional Stability/Moodiness",
        'statement_a': "I address conflicts calmly and rationally.",
        'statement_b': "I maintain emotional control during difficult conversations."
    },
    {
        'attr1': "Conflict Resolution",
        'attr2': "Ambition",
        'statement_a': "I focus on resolving workplace disagreements constructively.",
        'statement_b': "I strive to achieve my goals and advance my career."
    },

    # 53-54: Self-Awareness vs others
    {
        'attr1': "Self-Awareness",
        'attr2': "Emotional Stability/Moodiness",
        'statement_a': "I reflect on how my emotions affect my decisions and actions.",
        'statement_b': "I maintain emotional composure, even under pressure."
    },
    {
        'attr1': "Self-Awareness",
        'attr2': "Ambition",
        'statement_a': "I focus on understanding how my strengths contribute to my success.",
        'statement_b': "I aim to achieve recognition and advancement in my career."
    },

    # 55: Emotional Stability/Moodiness vs Ambition
    {
        'attr1': "Emotional Stability/Moodiness",
        'attr2': "Ambition",
        'statement_a': "I remain calm and balanced, even when challenges arise.",
        'statement_b': "I am driven to succeed and achieve my career goals."
    }
]

        # Create question pairs
        for order, question in enumerate(questions, 1):
            attr1 = attribute_objects[question['attr1']]
            attr2 = attribute_objects[question['attr2']]
            
            # Get or create the question pair
            pair, created = QuestionPair.objects.get_or_create(
                attribute1=attr1,
                attribute2=attr2,
                defaults={
                    'statement_a': question['statement_a'],
                    'statement_b': question['statement_b'],
                    'order': order,
                    'active': True
                }
            )
            
            if created:
                self.stdout.write(f'Created question pair: {attr1} vs {attr2}')
            else:
                self.stdout.write(f'Found existing question pair: {attr1} vs {attr2}')

        self.stdout.write(self.style.SUCCESS('Successfully imported all attributes and questions'))
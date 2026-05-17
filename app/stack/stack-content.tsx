'use client'

import { motion } from 'framer-motion'
import { SectionLabel } from '@/components/section-label'

type Proficiency = 'Expert' | 'Advanced' | 'Intermediate'

interface Tech {
  name: string
  proficiency: Proficiency
}

interface TechCategory {
  name: string
  items: Tech[]
}

const techStack: TechCategory[] = [
  {
    name: 'Languages',
    items: [
      { name: 'TypeScript', proficiency: 'Expert' },
      { name: 'Python', proficiency: 'Expert' },
      { name: 'C# / .NET', proficiency: 'Advanced' },
      { name: 'JavaScript', proficiency: 'Expert' },
      { name: 'SQL', proficiency: 'Advanced' },
      { name: 'Bash/Shell', proficiency: 'Advanced' },
      { name: 'HCL', proficiency: 'Advanced' },
    ]
  },
  {
    name: 'Frontend',
    items: [
      { name: 'Next.js', proficiency: 'Expert' },
      { name: 'React', proficiency: 'Expert' },
      { name: 'Tailwind CSS', proficiency: 'Expert' },
      { name: 'Framer Motion', proficiency: 'Advanced' },
      { name: 'HTML/CSS', proficiency: 'Expert' },
    ]
  },
  {
    name: 'Backend',
    items: [
      { name: 'Node.js', proficiency: 'Expert' },
      { name: '.NET 8', proficiency: 'Advanced' },
      { name: 'Express', proficiency: 'Advanced' },
      { name: 'FastAPI', proficiency: 'Advanced' },
      { name: 'REST APIs', proficiency: 'Expert' },
      { name: 'GraphQL', proficiency: 'Intermediate' },
    ]
  },
  {
    name: 'Databases',
    items: [
      { name: 'PostgreSQL', proficiency: 'Advanced' },
      { name: 'Supabase', proficiency: 'Expert' },
      { name: 'DynamoDB', proficiency: 'Intermediate' },
      { name: 'Redis', proficiency: 'Intermediate' },
      { name: 'SQLite', proficiency: 'Advanced' },
    ]
  },
  {
    name: 'Cloud & Infrastructure',
    items: [
      { name: 'AWS', proficiency: 'Advanced' },
      { name: 'Vercel', proficiency: 'Expert' },
      { name: 'Terraform', proficiency: 'Advanced' },
      { name: 'Docker', proficiency: 'Advanced' },
      { name: 'Kubernetes', proficiency: 'Advanced' },
      { name: 'GitHub Actions', proficiency: 'Expert' },
      { name: 'Jenkins', proficiency: 'Advanced' },
      { name: 'CloudFormation', proficiency: 'Intermediate' },
    ]
  },
  {
    name: 'Testing & QA',
    items: [
      { name: 'Selenium', proficiency: 'Expert' },
      { name: 'Playwright', proficiency: 'Expert' },
      { name: 'Cypress', proficiency: 'Advanced' },
      { name: 'Appium', proficiency: 'Advanced' },
      { name: 'pytest', proficiency: 'Expert' },
      { name: 'JMeter', proficiency: 'Advanced' },
      { name: 'Postman', proficiency: 'Expert' },
      { name: 'BDD/Cucumber', proficiency: 'Advanced' },
      { name: 'Allure', proficiency: 'Advanced' },
    ]
  },
  {
    name: 'AI & Data',
    items: [
      { name: 'GPT-4 / Claude API', proficiency: 'Advanced' },
      { name: 'scikit-learn', proficiency: 'Intermediate' },
      { name: 'pandas', proficiency: 'Advanced' },
      { name: 'NumPy', proficiency: 'Intermediate' },
      { name: 'Pydantic', proficiency: 'Advanced' },
    ]
  },
  {
    name: 'Trading & Market Data',
    items: [
      { name: 'NinjaTrader 8', proficiency: 'Expert' },
      { name: 'Sierra Chart', proficiency: 'Advanced' },
      { name: 'Alpaca API', proficiency: 'Advanced' },
      { name: 'Market Data APIs', proficiency: 'Advanced' },
    ]
  },
  {
    name: 'Tools & Platforms',
    items: [
      { name: 'Git', proficiency: 'Expert' },
      { name: 'GitHub', proficiency: 'Expert' },
      { name: 'Jira', proficiency: 'Advanced' },
      { name: 'Discord.js', proficiency: 'Advanced' },
      { name: 'Stripe API', proficiency: 'Advanced' },
      { name: 'Allure Reports', proficiency: 'Advanced' },
      { name: 'TestRail', proficiency: 'Advanced' },
    ]
  },
]

const proficiencyWidth: Record<Proficiency, string> = {
  Expert: 'w-full',
  Advanced: 'w-3/4',
  Intermediate: 'w-1/2',
}

const proficiencyColor: Record<Proficiency, string> = {
  Expert: 'bg-[#0ED3CF]',
  Advanced: 'bg-[#0ED3CF]/70',
  Intermediate: 'bg-[#0ED3CF]/40',
}

export function StackContent() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel>Stack</SectionLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#FAFAFA]">
            Technologies I Work With
          </h1>
          <p className="mt-6 text-lg text-[#A8A29E] max-w-2xl">
            50+ technologies across the full stack — from frontend to infrastructure to trading systems.
          </p>
        </motion.div>
      </section>

      {/* Tech Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-16">
          {techStack.map((category, categoryIndex) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
            >
              <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6">{category.name}</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {category.items.map((tech, techIndex) => (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: techIndex * 0.05 }}
                    className="p-4 bg-[#1A1917] border border-[#2A2826] rounded-xl hover:border-[#0ED3CF]/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-[#FAFAFA] group-hover:text-[#0ED3CF] transition-colors">
                        {tech.name}
                      </span>
                      <span className="text-xs text-[#78716C]">{tech.proficiency}</span>
                    </div>
                    <div className="h-1.5 bg-[#2A2826] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${proficiencyWidth[tech.proficiency]} ${proficiencyColor[tech.proficiency]} rounded-full transition-all duration-500`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}

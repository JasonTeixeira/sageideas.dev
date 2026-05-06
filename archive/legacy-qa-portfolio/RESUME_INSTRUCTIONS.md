# Resume Compilation Instructions

Your professional LaTeX resume is ready. Follow these steps to generate the PDF.

## What You Have

- **File Location:** `resume.tex` (project root)
- **HTML Version:** `public/resume.html` (also accessible at /resume on the site)
- **Format:** LaTeX (ATS-optimized, professional)
- **Style:** One-page, modern, recruiter-friendly

## Option 1: Overleaf (Easiest)

1. Go to [https://www.overleaf.com](https://www.overleaf.com)
2. Create free account (or login)
3. Click "New Project" > "Upload Project"
4. Upload `resume.tex` file
5. Click "Recompile"
6. Click "Download PDF"
7. Save as `resume.pdf`

## Option 2: Local Compilation

```bash
pdflatex resume.tex
```

## After Compiling

Copy the PDF to the public folder so the website download button works:

```bash
cp resume.pdf public/resume.pdf
```

## Resume Content

- **Summary:** Full-stack developer, 5 years fintech experience, self-taught, 9 certs, trilingual
- **Experience:** HighStrike (Trading Strategy Developer & Finance Analyst) > Freelance Developer > Sage Ideas LLC (General Contractor)
- **Key Projects:** Nexural Platform, AlphaStream, Testing Frameworks, Terraform Modules
- **Certifications:** ISTQB x3, AWS x5, Cisco
- **Education:** B.S. Computer Science (Full Sail), B.S. Finance (Kean)

## ATS Optimization

Resume is optimized for Applicant Tracking Systems:
- Simple LaTeX formatting (no complex tables)
- Standard section headers
- Keywords front-loaded
- Quantified achievements
- One-page format
- No graphics/photos

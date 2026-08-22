import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import InstructorCard, {
  INSTRUCTOR_LINKEDIN_URL,
  INSTRUCTOR_NAME,
  INSTRUCTOR_YOUTUBE_URL,
} from '@/components/cohort/InstructorCard';

describe('InstructorCard', () => {
  it('links the YouTube and LinkedIn marks to the profiles, opening in a new tab safely', () => {
    render(<InstructorCard />);
    const youtube = screen.getByRole('link', { name: /youtube/i });
    const linkedin = screen.getByRole('link', { name: /linkedin/i });

    expect(youtube).toHaveAttribute('href', INSTRUCTOR_YOUTUBE_URL);
    expect(linkedin).toHaveAttribute('href', INSTRUCTOR_LINKEDIN_URL);
    for (const link of [youtube, linkedin]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.getAttribute('rel')).toContain('noreferrer');
    }
  });

  it('accepts overrides for both profile links', () => {
    render(<InstructorCard youtubeUrl="https://youtube.example/x" linkedinUrl="https://linkedin.example/y" />);
    expect(screen.getByRole('link', { name: /youtube/i })).toHaveAttribute('href', 'https://youtube.example/x');
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.example/y');
  });

  it('gives the icon-only buttons an accessible name and a matching tooltip, with the icons hidden from AT', () => {
    render(<InstructorCard />);
    const youtube = screen.getByRole('link', { name: /youtube/i });
    const linkedin = screen.getByRole('link', { name: /linkedin/i });
    expect(youtube).toHaveAccessibleName('YouTube · 1M+ views');
    expect(youtube).toHaveAttribute('title', 'YouTube · 1M+ views');
    expect(linkedin).toHaveAccessibleName('LinkedIn');
    expect(linkedin).toHaveAttribute('title', 'LinkedIn');
    for (const link of [youtube, linkedin]) {
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('carries the name, the practitioner tagline and the four proof lines', () => {
    render(<InstructorCard />);
    expect(screen.getByText(INSTRUCTOR_NAME)).toBeInTheDocument();
    expect(screen.getByText('Ships AI products in production')).toBeInTheDocument();

    const terms = screen.getAllByRole('term').map((el) => el.textContent);
    const lines = screen.getAllByRole('definition').map((el) => el.textContent);
    expect(terms).toEqual(['2,000+', 'Author', '1M+', 'Alumni']);
    expect(lines).toEqual([
      'PMs and builders mentored over 4 years',
      'Product Management book on IIM elective lists',
      'views teaching AI product work on YouTube',
      'IIT Kanpur · IIM Bangalore',
    ]);
  });

  it('does not repeat facts the hero already states', () => {
    render(<InstructorCard />);
    expect(screen.queryByText(/AI Product Builder Cohort/)).toBeNull();
    expect(screen.queryByText(/15K/)).toBeNull();
  });

  it('marks the portrait as priority so it is preloaded as the desktop LCP candidate', () => {
    render(<InstructorCard />);
    const img = screen.getByRole('img', { name: INSTRUCTOR_NAME });
    expect(img).toHaveAttribute('data-priority', 'true');
  });

  it('is a labelled complementary region', () => {
    render(<InstructorCard />);
    expect(screen.getByRole('complementary', { name: /your mentor/i })).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectCard } from '../src/components/ProjectCard.jsx';

const mockProject = {
  name: 'ephemere-color-of-noise',
  photoCount: 12,
  lastAnalysis: '2026-03-15T10:30:00Z',
};

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <ProjectCard project={{ ...mockProject, ...props }} />
    </MemoryRouter>
  );
}

describe('ProjectCard', () => {
  it('renders project name', () => {
    renderCard();
    expect(screen.getByText('ephemere-color-of-noise')).toBeInTheDocument();
  });

  it('renders photo count', () => {
    renderCard();
    expect(screen.getByText(/12 photos/i)).toBeInTheDocument();
  });

  it('renders last analysis date', () => {
    renderCard();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('links to project results page', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/projects/ephemere-color-of-noise');
  });

  it('handles missing lastAnalysis', () => {
    renderCard({ lastAnalysis: null });
    expect(screen.getByText(/no analysis/i)).toBeInTheDocument();
  });

  it('handles zero photo count', () => {
    renderCard({ photoCount: 0 });
    expect(screen.getByText(/0 photos/i)).toBeInTheDocument();
  });
});

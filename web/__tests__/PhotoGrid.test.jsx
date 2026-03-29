import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhotoGrid } from '../src/components/PhotoGrid.jsx';

const mockPhotos = [
  { photo: 'photos/a.jpg', overall_score: 7.0, rank: 2, tier: 'mid', individual_scores: {} },
  { photo: 'photos/b.jpg', overall_score: 9.0, rank: 1, tier: 'top', individual_scores: {} },
];

describe('PhotoGrid', () => {
  it('renders all photo cards', () => {
    render(<PhotoGrid photos={mockPhotos} projectName="test-oc" />);
    expect(screen.getByText('a.jpg')).toBeInTheDocument();
    expect(screen.getByText('b.jpg')).toBeInTheDocument();
  });

  it('renders empty state when no photos', () => {
    render(<PhotoGrid photos={[]} projectName="test-oc" />);
    expect(screen.getByText(/no photos/i)).toBeInTheDocument();
  });

  it('renders photos in provided order', () => {
    render(<PhotoGrid photos={mockPhotos} projectName="test-oc" />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
  });
});

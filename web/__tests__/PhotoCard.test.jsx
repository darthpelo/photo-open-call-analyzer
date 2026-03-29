import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoCard } from '../src/components/PhotoCard.jsx';

const mockPhoto = {
  photo: 'photos/sunset.jpg',
  overall_score: 8.5,
  rank: 1,
  tier: 'top',
  individual_scores: {
    composition: { score: 9 },
    lighting: { score: 8 },
  },
};

describe('PhotoCard', () => {
  it('renders photo filename', () => {
    render(<PhotoCard photo={mockPhoto} projectName="test-oc" />);
    expect(screen.getByText('sunset.jpg')).toBeInTheDocument();
  });

  it('renders overall score', () => {
    render(<PhotoCard photo={mockPhoto} projectName="test-oc" />);
    expect(screen.getByText('8.5')).toBeInTheDocument();
  });

  it('renders rank', () => {
    render(<PhotoCard photo={mockPhoto} projectName="test-oc" />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('renders tier badge', () => {
    render(<PhotoCard photo={mockPhoto} projectName="test-oc" />);
    expect(screen.getByText('top')).toBeInTheDocument();
  });

  it('renders thumbnail with lazy loading', () => {
    render(<PhotoCard photo={mockPhoto} projectName="test-oc" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img.src).toContain('/api/projects/test-oc/photos/sunset.jpg/thumb?w=300');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<PhotoCard photo={mockPhoto} projectName="test-oc" onClick={onClick} />);
    fireEvent.click(screen.getByRole('img'));
    expect(onClick).toHaveBeenCalledWith(mockPhoto);
  });

  it('renders checkbox for compare selection', () => {
    const onToggle = vi.fn();
    render(
      <PhotoCard
        photo={mockPhoto}
        projectName="test-oc"
        selectable
        selected={false}
        onToggleSelect={onToggle}
      />
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(mockPhoto);
  });

  it('handles missing tier gracefully', () => {
    const noTier = { ...mockPhoto, tier: undefined };
    render(<PhotoCard photo={noTier} projectName="test-oc" />);
    expect(screen.queryByText('top')).not.toBeInTheDocument();
  });
});

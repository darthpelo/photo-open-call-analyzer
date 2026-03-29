import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SortControls } from '../src/components/SortControls.jsx';

describe('SortControls', () => {
  const criteriaNames = ['composition', 'lighting', 'theme_relevance'];

  it('renders overall score option', () => {
    render(<SortControls criteria={criteriaNames} onSort={vi.fn()} currentSort="overall" />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Overall Score')).toBeInTheDocument();
  });

  it('renders criterion options', () => {
    render(<SortControls criteria={criteriaNames} onSort={vi.fn()} currentSort="overall" />);
    expect(screen.getByText('composition')).toBeInTheDocument();
    expect(screen.getByText('lighting')).toBeInTheDocument();
    expect(screen.getByText('theme_relevance')).toBeInTheDocument();
  });

  it('calls onSort when selection changes', () => {
    const onSort = vi.fn();
    render(<SortControls criteria={criteriaNames} onSort={onSort} currentSort="overall" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'composition' } });
    expect(onSort).toHaveBeenCalledWith('composition');
  });

  it('renders empty when no criteria', () => {
    render(<SortControls criteria={[]} onSort={vi.fn()} currentSort="overall" />);
    const select = screen.getByRole('combobox');
    // Should still have "Overall Score" option
    expect(select.options).toHaveLength(1);
  });
});

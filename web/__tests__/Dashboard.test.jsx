import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock the API client
vi.mock('../src/api/client.js', () => ({
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  fetchProjectResults: vi.fn(),
  thumbnailUrl: vi.fn((p, f) => `/thumb/${p}/${f}`),
  photoUrl: vi.fn((p, f) => `/photo/${p}/${f}`),
}));

import { fetchProjects } from '../src/api/client.js';
import { Dashboard } from '../src/pages/Dashboard.jsx';

const mockProjects = [
  { name: 'ephemere-color-of-noise', photoCount: 12, lastAnalysis: '2026-03-15T10:30:00Z' },
  { name: 'loosenart-geographies', photoCount: 8, lastAnalysis: '2026-03-10T14:00:00Z' },
  { name: 'exposure-shape-of-moment', photoCount: 5, lastAnalysis: null },
];

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    fetchProjects.mockReturnValue(new Promise(() => {})); // Never resolves
    renderDashboard();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders project cards after loading', async () => {
    fetchProjects.mockResolvedValue(mockProjects);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('ephemere-color-of-noise')).toBeInTheDocument();
    });
    expect(screen.getByText('loosenart-geographies')).toBeInTheDocument();
    expect(screen.getByText('exposure-shape-of-moment')).toBeInTheDocument();
  });

  it('filters projects by search query', async () => {
    fetchProjects.mockResolvedValue(mockProjects);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('ephemere-color-of-noise')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'ephemere' } });
    expect(screen.getByText('ephemere-color-of-noise')).toBeInTheDocument();
    expect(screen.queryByText('loosenart-geographies')).not.toBeInTheDocument();
  });

  it('shows empty state when no projects', async () => {
    fetchProjects.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/no projects/i)).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    fetchProjects.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/no projects/i)).toBeInTheDocument();
    });
  });
});

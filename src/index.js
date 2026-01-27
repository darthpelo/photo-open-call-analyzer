#!/usr/bin/env node

/**
 * Photo Open Call Analyzer - Main Entry Point
 * This is the main CLI entry point for the application
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// For now, delegate to analyze CLI
// In the future, this could be expanded to a main menu/router
await import('./analyze.js');

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.html',
  styleUrls: ['./kpi-card.css']
})
export class KpiCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = 0;
  @Input() icon: string = '';
  @Input() borderColor: string = '';

  getRgbaColor(color: string): string {
    if (!color) return 'rgba(146, 146, 219, 0.1)';
    
    // Si es un color en formato HEX (ej: #3b82f6)
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.1)`;
    }
    
    // Si es una variable CSS (ej: var(--primary))
    if (color.startsWith('var')) {
      if (color.includes('--primary')) return 'rgba(146, 146, 219, 0.1)';
      return 'rgba(0, 0, 0, 0.05)';
    }

    // Colores predefinidos de CSS común
    const basicColors: { [key: string]: string } = {
      'orange': 'rgba(255, 165, 0, 0.1)',
      'red': 'rgba(255, 0, 0, 0.1)',
      'green': 'rgba(0, 128, 0, 0.1)',
      'blue': 'rgba(0, 0, 255, 0.1)',
      'cyan': 'rgba(6, 182, 212, 0.1)',
      'purple': 'rgba(146, 146, 219, 0.1)'
    };
    
    return basicColors[color.toLowerCase()] || 'rgba(146, 146, 219, 0.1)';
  }
}

import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/public-sans';
import './styles/app.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);

import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { MainMenu } from './ui/screens/MainMenu';
import { Setup } from './ui/screens/Setup';
import { GameView } from './ui/screens/GameView';
import { Credits } from './ui/screens/Credits';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/game" element={<GameView />} />
        <Route path="/credits" element={<Credits />} />
      </Routes>
    </BrowserRouter>
  );
}

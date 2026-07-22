import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from "./app";
import Home from './home/home';
import GameList from './game/game-list';
import GameAdd from './game/game-add';
import GameEdit from './game/game-edit';
import GameStatsList from './game-stats/game-stats-list';
import GameStatsAdd from './game-stats/game-stats-add';
import GameStatsEdit from './game-stats/game-stats-edit';
import Error from './error/error';


export default function AppRoutes() {
  const router = createBrowserRouter([
    {
      element: <App />,
      children: [
        { path: '', element: <Home /> },
        { path: 'games', element: <GameList /> },
        { path: 'games/add', element: <GameAdd /> },
        { path: 'games/edit/:id', element: <GameEdit /> },
        { path: 'gameStatss', element: <GameStatsList /> },
        { path: 'gameStatss/add', element: <GameStatsAdd /> },
        { path: 'gameStatss/edit/:id', element: <GameStatsEdit /> },
        { path: 'error', element: <Error /> },
        { path: '*', element: <Error /> }
      ]
    }
  ]);

  return (
    <RouterProvider router={router} />
  );
}

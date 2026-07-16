import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { handleServerError } from 'app/common/utils';
import { GameDTO } from 'app/game/game-model';
import axios from 'axios';
import useDocumentTitle from 'app/common/use-document-title';


export default function GameList() {
  const { t } = useTranslation();
  useDocumentTitle(t('game.list.headline'));

  const [games, setGames] = useState<GameDTO[]>([]);
  const navigate = useNavigate();

  const getAllGames = async () => {
    try {
      const response = await axios.get('/api/games');
      setGames(response.data);
    } catch (error: any) {
      handleServerError(error, navigate);
    }
  };

  const confirmDelete = async (id: number) => {
    if (!confirm(t('delete.confirm'))) {
      return;
    }
    try {
      await axios.delete('/api/games/' + id);
      navigate('/games', {
            state: {
              msgInfo: t('game.delete.success')
            }
          });
      getAllGames();
    } catch (error: any) {
      handleServerError(error, navigate);
    }
  };

  useEffect(() => {
    getAllGames();
  }, []);

  return (<>
    <div className="d-flex flex-wrap mb-4">
      <h1 className="flex-grow-1">{t('game.list.headline')}</h1>
      <div>
        <Link to="/games/add" className="btn btn-primary ms-2">{t('game.list.createNew')}</Link>
      </div>
    </div>
    {!games || games.length === 0 ? (
    <div>{t('game.list.empty')}</div>
    ) : (
    <div className="table-responsive">
      <table className="table table-striped table-hover align-middle">
        <thead>
          <tr>
            <th scope="col">{t('game.id.label')}</th>
            <th scope="col">{t('game.name.label')}</th>
            <th scope="col">{t('game.statistic.label')}</th>
            <th scope="col">{t('game.user.label')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
          <tr key={game.id}>
            <td>{game.id}</td>
            <td>{game.name}</td>
            <td>{game.statistic}</td>
            <td>{game.user}</td>
            <td>
              <div className="float-end text-nowrap">
                <Link to={'/games/edit/' + game.id} className="btn btn-sm btn-secondary">{t('game.list.edit')}</Link>
                <span> </span>
                <button type="button" onClick={() => confirmDelete(game.id!)} className="btn btn-sm btn-secondary">{t('game.list.delete')}</button>
              </div>
            </td>
          </tr>
          ))}
        </tbody>
      </table>
    </div>
    )}
  </>);
}

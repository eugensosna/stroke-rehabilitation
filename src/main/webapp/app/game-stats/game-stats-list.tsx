import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { handleServerError } from 'app/common/utils';
import { GameStatsDTO } from 'app/game-stats/game-stats-model';
import axios from 'axios';
import useDocumentTitle from 'app/common/use-document-title';


export default function GameStatsList() {
  const { t } = useTranslation();
  useDocumentTitle(t('gameStats.list.headline'));

  const [gameStatses, setGameStatses] = useState<GameStatsDTO[]>([]);
  const navigate = useNavigate();

  const getAllGameStatses = async () => {
    try {
      const response = await axios.get('/api/gameStatss');
      setGameStatses(response.data);
    } catch (error: any) {
      handleServerError(error, navigate);
    }
  };

  const confirmDelete = async (id: number) => {
    if (!confirm(t('delete.confirm'))) {
      return;
    }
    try {
      await axios.delete('/api/gameStatss/' + id);
      navigate('/gameStatss', {
            state: {
              msgInfo: t('gameStats.delete.success')
            }
          });
      getAllGameStatses();
    } catch (error: any) {
      if (error?.response?.data?.code === 'REFERENCED') {
        const messageParts = error.response.data.message.split(',');
        navigate('/gameStatss', {
              state: {
                msgError: t(messageParts[0]!, { id: messageParts[1]! })
              }
            });
        return;
      }
      handleServerError(error, navigate);
    }
  };

  useEffect(() => {
    getAllGameStatses();
  }, []);

  return (<>
    <div className="d-flex flex-wrap mb-4">
      <h1 className="flex-grow-1">{t('gameStats.list.headline')}</h1>
      <div>
        <Link to="/gameStatss/add" className="btn btn-primary ms-2">{t('gameStats.list.createNew')}</Link>
      </div>
    </div>
    {!gameStatses || gameStatses.length === 0 ? (
    <div>{t('gameStats.list.empty')}</div>
    ) : (
    <div className="table-responsive">
      <table className="table table-striped table-hover align-middle">
        <thead>
          <tr>
            <th scope="col">{t('gameStats.id.label')}</th>
            <th scope="col">{t('gameStats.start.label')}</th>
            <th scope="col">{t('gameStats.duration.label')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {gameStatses.map((gameStats) => (
          <tr key={gameStats.id}>
            <td>{gameStats.id}</td>
            <td>{gameStats.start}</td>
            <td>{gameStats.duration}</td>
            <td>
              <div className="float-end text-nowrap">
                <Link to={'/gameStatss/edit/' + gameStats.id} className="btn btn-sm btn-secondary">{t('gameStats.list.edit')}</Link>
                <span> </span>
                <button type="button" onClick={() => confirmDelete(gameStats.id!)} className="btn btn-sm btn-secondary">{t('gameStats.list.delete')}</button>
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

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { handleServerError, setYupDefaults } from 'app/common/utils';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { GameDTO } from 'app/game/game-model';
import axios from 'axios';
import InputRow from 'app/common/input-row/input-row';
import useDocumentTitle from 'app/common/use-document-title';
import * as yup from 'yup';


function getSchema() {
  setYupDefaults();
  return yup.object({
    name: yup.string().emptyToNull().max(255),
    statistic: yup.number().integer().emptyToNull(),
    user: yup.number().integer().emptyToNull()
  });
}

export default function GameAdd() {
  const { t } = useTranslation();
  useDocumentTitle(t('game.add.headline'));

  const navigate = useNavigate();
  const [statisticValues, setStatisticValues] = useState<Map<number,string>>(new Map());
  const [userValues, setUserValues] = useState<Map<number,string>>(new Map());

  const useFormResult = useForm({
    resolver: yupResolver(getSchema()),
  });

  const getMessage = (key: string) => {
    const messages: Record<string, string> = {
      GAME_STATISTIC_UNIQUE: t('Exists.game.statistic')
    };
    return messages[key];
  };

  const prepareRelations = async () => {
    try {
      const statisticValuesResponse = await axios.get('/api/games/statisticValues');
      setStatisticValues(statisticValuesResponse.data);
      const userValuesResponse = await axios.get('/api/games/userValues');
      setUserValues(userValuesResponse.data);
    } catch (error: any) {
      handleServerError(error, navigate);
    }
  };

  useEffect(() => {
    prepareRelations();
  }, []);

  const createGame = async (data: GameDTO) => {
    window.scrollTo(0, 0);
    try {
      await axios.post('/api/games', data);
      navigate('/games', {
            state: {
              msgSuccess: t('game.create.success')
            }
          });
    } catch (error: any) {
      handleServerError(error, navigate, useFormResult.setError, t, getMessage);
    }
  };

  return (<>
    <div className="d-flex flex-wrap mb-4">
      <h1 className="flex-grow-1">{t('game.add.headline')}</h1>
      <div>
        <Link to="/games" className="btn btn-secondary">{t('game.add.back')}</Link>
      </div>
    </div>
    <form onSubmit={useFormResult.handleSubmit(createGame)} noValidate>
      <InputRow useFormResult={useFormResult} object="game" field="name" />
      <InputRow useFormResult={useFormResult} object="game" field="statistic" type="select" options={statisticValues} />
      <InputRow useFormResult={useFormResult} object="game" field="user" type="select" options={userValues} />
      <input type="submit" value={t('game.add.headline')} className="btn btn-primary mt-4" />
    </form>
  </>);
}

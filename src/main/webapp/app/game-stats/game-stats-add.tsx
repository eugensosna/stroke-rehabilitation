import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { handleServerError, setYupDefaults } from 'app/common/utils';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { GameStatsDTO } from 'app/game-stats/game-stats-model';
import axios from 'axios';
import InputRow from 'app/common/input-row/input-row';
import useDocumentTitle from 'app/common/use-document-title';
import * as yup from 'yup';


function getSchema() {
  setYupDefaults();
  return yup.object({
    start: yup.string().emptyToNull().offsetDateTime(),
    duration: yup.string().emptyToNull().numeric(12, 3)
  });
}

export default function GameStatsAdd() {
  const { t } = useTranslation();
  useDocumentTitle(t('gameStats.add.headline'));

  const navigate = useNavigate();

  const useFormResult = useForm({
    resolver: yupResolver(getSchema()),
  });

  const createGameStats = async (data: GameStatsDTO) => {
    window.scrollTo(0, 0);
    try {
      await axios.post('/api/gameStatss', data);
      navigate('/gameStatss', {
            state: {
              msgSuccess: t('gameStats.create.success')
            }
          });
    } catch (error: any) {
      handleServerError(error, navigate, useFormResult.setError, t);
    }
  };

  return (<>
    <div className="d-flex flex-wrap mb-4">
      <h1 className="flex-grow-1">{t('gameStats.add.headline')}</h1>
      <div>
        <Link to="/gameStatss" className="btn btn-secondary">{t('gameStats.add.back')}</Link>
      </div>
    </div>
    <form onSubmit={useFormResult.handleSubmit(createGameStats)} noValidate>
      <InputRow useFormResult={useFormResult} object="gameStats" field="start" />
      <InputRow useFormResult={useFormResult} object="gameStats" field="duration" />
      <input type="submit" value={t('gameStats.add.headline')} className="btn btn-primary mt-4" />
    </form>
  </>);
}

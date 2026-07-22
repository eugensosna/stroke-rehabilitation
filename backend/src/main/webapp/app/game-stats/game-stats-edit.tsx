import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
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

export default function GameStatsEdit() {
  const { t } = useTranslation();
  useDocumentTitle(t('gameStats.edit.headline'));

  const navigate = useNavigate();
  const params = useParams();
  const currentId = +params.id!;

  const useFormResult = useForm({
    resolver: yupResolver(getSchema()),
  });

  const prepareForm = async () => {
    try {
      const data = (await axios.get('/api/gameStatss/' + currentId)).data;
      useFormResult.reset(data);
    } catch (error: any) {
      handleServerError(error, navigate);
    }
  };

  useEffect(() => {
    prepareForm();
  }, []);

  const updateGameStats = async (data: GameStatsDTO) => {
    window.scrollTo(0, 0);
    try {
      await axios.put('/api/gameStatss/' + currentId, data);
      navigate('/gameStatss', {
            state: {
              msgSuccess: t('gameStats.update.success')
            }
          });
    } catch (error: any) {
      handleServerError(error, navigate, useFormResult.setError, t);
    }
  };

  return (<>
    <div className="d-flex flex-wrap mb-4">
      <h1 className="flex-grow-1">{t('gameStats.edit.headline')}</h1>
      <div>
        <Link to="/gameStatss" className="btn btn-secondary">{t('gameStats.edit.back')}</Link>
      </div>
    </div>
    <form onSubmit={useFormResult.handleSubmit(updateGameStats)} noValidate>
      <InputRow useFormResult={useFormResult} object="gameStats" field="id" disabled={true} type="number" />
      <InputRow useFormResult={useFormResult} object="gameStats" field="start" />
      <InputRow useFormResult={useFormResult} object="gameStats" field="duration" />
      <input type="submit" value={t('gameStats.edit.headline')} className="btn btn-primary mt-4" />
    </form>
  </>);
}

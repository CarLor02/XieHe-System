"""
医疗影像诊断系统 - 患者服务单元测试

测试患者服务的各种功能和业务逻辑

@author 医疗影像团队
@version 1.0.0
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, date
from uuid import uuid4

from app.services.patient_service import PatientService
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate
from app.core.exceptions import NotFoundError, ValidationError


class TestPatientService:
    """患者服务测试类"""

    @pytest.fixture
    def mock_db_session(self):
        """模拟数据库会话"""
        return Mock()

    @pytest.fixture
    def patient_service(self, mock_db_session):
        """患者服务实例"""
        return PatientService(db=mock_db_session)

    @pytest.fixture
    def sample_patient_data(self):
        """示例患者数据"""
        return {
            "name": "张三",
            "age": 35,
            "gender": "male",
            "phone": "13800138000",
            "email": "zhangsan@example.com",
            "address": "北京市朝阳区",
            "id_card": "110101198801010001",
            "emergency_contact": "李四",
            "emergency_phone": "13900139000"
        }

    @pytest.fixture
    def sample_patient(self, sample_patient_data):
        """示例患者模型"""
        return Patient(
            id=str(uuid4()),
            created_at=datetime.now(),
            updated_at=datetime.now(),
            **sample_patient_data
        )

    class TestCreatePatient:
        """创建患者测试"""

        @pytest.mark.asyncio
        async def test_create_patient_success(self, patient_service, mock_db_session, sample_patient_data):
            """测试成功创建患者"""
            # Arrange
            patient_create = PatientCreate(**sample_patient_data)
            expected_patient = Patient(id=str(uuid4()), **sample_patient_data)
            
            mock_db_session.add = Mock()
            mock_db_session.commit = AsyncMock()
            mock_db_session.refresh = AsyncMock()
            
            with patch('app.models.patient.Patient', return_value=expected_patient):
                # Act
                result = await patient_service.create_patient(patient_create)
                
                # Assert
                assert result.name == sample_patient_data["name"]
                assert result.age == sample_patient_data["age"]
                assert result.gender == sample_patient_data["gender"]
                mock_db_session.add.assert_called_once()
                mock_db_session.commit.assert_called_once()

        @pytest.mark.asyncio
        async def test_create_patient_duplicate_phone(self, patient_service, mock_db_session, sample_patient_data):
            """测试创建患者时手机号重复"""
            # Arrange
            patient_create = PatientCreate(**sample_patient_data)
            mock_db_session.query().filter().first.return_value = Mock()  # 模拟已存在的患者
            
            # Act & Assert
            with pytest.raises(ValidationError, match="手机号已存在"):
                await patient_service.create_patient(patient_create)

        @pytest.mark.asyncio
        async def test_create_patient_invalid_age(self, patient_service, sample_patient_data):
            """测试创建患者时年龄无效"""
            # Arrange
            sample_patient_data["age"] = -1
            
            # Act & Assert
            with pytest.raises(ValidationError):
                PatientCreate(**sample_patient_data)

        @pytest.mark.asyncio
        async def test_create_patient_invalid_phone(self, patient_service, sample_patient_data):
            """测试创建患者时手机号格式无效"""
            # Arrange
            sample_patient_data["phone"] = "invalid_phone"
            
            # Act & Assert
            with pytest.raises(ValidationError):
                PatientCreate(**sample_patient_data)

    class TestGetPatient:
        """获取患者测试"""

        @pytest.mark.asyncio
        async def test_get_patient_by_id_success(self, patient_service, mock_db_session, sample_patient):
            """测试通过ID成功获取患者"""
            # Arrange
            patient_id = sample_patient.id
            mock_db_session.query().filter().first.return_value = sample_patient
            
            # Act
            result = await patient_service.get_patient_by_id(patient_id)
            
            # Assert
            assert result.id == patient_id
            assert result.name == sample_patient.name
            mock_db_session.query().filter().first.assert_called_once()

        @pytest.mark.asyncio
        async def test_get_patient_by_id_not_found(self, patient_service, mock_db_session):
            """测试获取不存在的患者"""
            # Arrange
            patient_id = str(uuid4())
            mock_db_session.query().filter().first.return_value = None
            
            # Act & Assert
            with pytest.raises(NotFoundError, match="患者不存在"):
                await patient_service.get_patient_by_id(patient_id)

        @pytest.mark.asyncio
        async def test_get_patient_by_phone_success(self, patient_service, mock_db_session, sample_patient):
            """测试通过手机号成功获取患者"""
            # Arrange
            phone = sample_patient.phone
            mock_db_session.query().filter().first.return_value = sample_patient
            
            # Act
            result = await patient_service.get_patient_by_phone(phone)
            
            # Assert
            assert result.phone == phone
            assert result.name == sample_patient.name

    class TestUpdatePatient:
        """更新患者测试"""

        @pytest.mark.asyncio
        async def test_update_patient_success(self, patient_service, mock_db_session, sample_patient):
            """测试成功更新患者信息"""
            # Arrange
            patient_id = sample_patient.id
            update_data = PatientUpdate(name="李四", age=40)
            
            mock_db_session.query().filter().first.return_value = sample_patient
            mock_db_session.commit = AsyncMock()
            mock_db_session.refresh = AsyncMock()
            
            # Act
            result = await patient_service.update_patient(patient_id, update_data)
            
            # Assert
            assert result.name == "李四"
            assert result.age == 40
            mock_db_session.commit.assert_called_once()

        @pytest.mark.asyncio
        async def test_update_patient_not_found(self, patient_service, mock_db_session):
            """测试更新不存在的患者"""
            # Arrange
            patient_id = str(uuid4())
            update_data = PatientUpdate(name="李四")
            mock_db_session.query().filter().first.return_value = None
            
            # Act & Assert
            with pytest.raises(NotFoundError, match="患者不存在"):
                await patient_service.update_patient(patient_id, update_data)

        @pytest.mark.asyncio
        async def test_update_patient_partial(self, patient_service, mock_db_session, sample_patient):
            """测试部分更新患者信息"""
            # Arrange
            patient_id = sample_patient.id
            update_data = PatientUpdate(age=45)  # 只更新年龄
            
            mock_db_session.query().filter().first.return_value = sample_patient
            mock_db_session.commit = AsyncMock()
            mock_db_session.refresh = AsyncMock()
            
            # Act
            result = await patient_service.update_patient(patient_id, update_data)
            
            # Assert
            assert result.age == 45
            assert result.name == sample_patient.name  # 名字不变

    class TestDeletePatient:
        """删除患者测试"""

        @pytest.mark.asyncio
        async def test_delete_patient_success(self, patient_service, mock_db_session, sample_patient):
            """测试成功删除患者"""
            # Arrange
            patient_id = sample_patient.id
            mock_db_session.query().filter().first.return_value = sample_patient
            mock_db_session.delete = Mock()
            mock_db_session.commit = AsyncMock()
            
            # Act
            result = await patient_service.delete_patient(patient_id)
            
            # Assert
            assert result is True
            mock_db_session.delete.assert_called_once_with(sample_patient)
            mock_db_session.commit.assert_called_once()

        @pytest.mark.asyncio
        async def test_delete_patient_not_found(self, patient_service, mock_db_session):
            """测试删除不存在的患者"""
            # Arrange
            patient_id = str(uuid4())
            mock_db_session.query().filter().first.return_value = None
            
            # Act & Assert
            with pytest.raises(NotFoundError, match="患者不存在"):
                await patient_service.delete_patient(patient_id)

        @pytest.mark.asyncio
        async def test_soft_delete_patient(self, patient_service, mock_db_session, sample_patient):
            """测试软删除患者"""
            # Arrange
            patient_id = sample_patient.id
            mock_db_session.query().filter().first.return_value = sample_patient
            mock_db_session.commit = AsyncMock()
            
            # Act
            result = await patient_service.soft_delete_patient(patient_id)
            
            # Assert
            assert result is True
            assert sample_patient.is_deleted is True
            assert sample_patient.deleted_at is not None
            mock_db_session.commit.assert_called_once()

    class TestListPatients:
        """患者列表测试"""

        @pytest.mark.asyncio
        async def test_list_patients_success(self, patient_service, mock_db_session):
            """测试成功获取患者列表"""
            # Arrange
            mock_patients = [Mock(), Mock(), Mock()]
            mock_query = Mock()
            mock_query.offset().limit().all.return_value = mock_patients
            mock_query.count.return_value = 3
            mock_db_session.query.return_value = mock_query
            
            # Act
            result = await patient_service.list_patients(page=1, page_size=10)
            
            # Assert
            assert len(result.items) == 3
            assert result.total == 3
            assert result.page == 1
            assert result.page_size == 10

        @pytest.mark.asyncio
        async def test_list_patients_with_search(self, patient_service, mock_db_session):
            """测试带搜索条件的患者列表"""
            # Arrange
            search_term = "张三"
            mock_query = Mock()
            mock_query.filter().offset().limit().all.return_value = []
            mock_query.filter().count.return_value = 0
            mock_db_session.query.return_value = mock_query
            
            # Act
            result = await patient_service.list_patients(search=search_term)
            
            # Assert
            mock_query.filter.assert_called()

        @pytest.mark.asyncio
        async def test_list_patients_pagination(self, patient_service, mock_db_session):
            """测试患者列表分页"""
            # Arrange
            page = 2
            page_size = 5
            mock_query = Mock()
            mock_query.offset().limit().all.return_value = []
            mock_query.count.return_value = 15
            mock_db_session.query.return_value = mock_query
            
            # Act
            result = await patient_service.list_patients(page=page, page_size=page_size)
            
            # Assert
            mock_query.offset.assert_called_with(5)  # (page - 1) * page_size
            mock_query.offset().limit.assert_called_with(5)

    class TestPatientValidation:
        """患者数据验证测试"""

        def test_validate_phone_format(self, patient_service):
            """测试手机号格式验证"""
            # 有效手机号
            assert patient_service._validate_phone("13800138000") is True
            assert patient_service._validate_phone("15912345678") is True
            
            # 无效手机号
            assert patient_service._validate_phone("12345678901") is False
            assert patient_service._validate_phone("1380013800") is False
            assert patient_service._validate_phone("abc12345678") is False

        def test_validate_id_card_format(self, patient_service):
            """测试身份证号格式验证"""
            # 有效身份证号
            assert patient_service._validate_id_card("110101198801010001") is True
            assert patient_service._validate_id_card("11010119880101000X") is True
            
            # 无效身份证号
            assert patient_service._validate_id_card("12345678901234567") is False
            assert patient_service._validate_id_card("110101198801010") is False

        def test_validate_age_range(self, patient_service):
            """测试年龄范围验证"""
            # 有效年龄
            assert patient_service._validate_age(0) is True
            assert patient_service._validate_age(35) is True
            assert patient_service._validate_age(120) is True
            
            # 无效年龄
            assert patient_service._validate_age(-1) is False
            assert patient_service._validate_age(121) is False

    class TestPatientStatistics:
        """患者统计测试"""

        @pytest.mark.asyncio
        async def test_get_patient_statistics(self, patient_service, mock_db_session):
            """测试获取患者统计信息"""
            # Arrange
            mock_db_session.query().count.return_value = 100
            mock_db_session.query().filter().count.side_effect = [60, 40]  # 男性60，女性40
            
            # Act
            stats = await patient_service.get_patient_statistics()
            
            # Assert
            assert stats.total_patients == 100
            assert stats.male_patients == 60
            assert stats.female_patients == 40

        @pytest.mark.asyncio
        async def test_get_age_distribution(self, patient_service, mock_db_session):
            """测试获取年龄分布统计"""
            # Arrange
            mock_result = [
                (20, 10),  # 20-29岁: 10人
                (30, 15),  # 30-39岁: 15人
                (40, 8),   # 40-49岁: 8人
            ]
            mock_db_session.execute().fetchall.return_value = mock_result
            
            # Act
            distribution = await patient_service.get_age_distribution()
            
            # Assert
            assert len(distribution) == 3
            assert distribution[0]["age_group"] == "20-29"
            assert distribution[0]["count"] == 10

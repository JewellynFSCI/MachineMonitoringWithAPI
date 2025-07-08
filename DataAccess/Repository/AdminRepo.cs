using System.Data;
using MachineMonitoring.Models;
using MySql.Data.MySqlClient;
using Dapper;
using MachineMonitoring.Models.ViewModel;
using Microsoft.AspNetCore.Mvc;
using MachineMonitoring.Models.DTOs;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using System.Text;
using static System.Runtime.InteropServices.JavaScript.JSType;
using System.Net.Http;


namespace MachineMonitoring.DataAccess.Repository
{
    public class AdminRepo
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AdminRepo> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly string _mcCodes = "";
        private readonly string _sendDataToOws = "";
        private readonly string _getEmployeeDetails = "";

        public AdminRepo(IConfiguration configuration, ILogger<AdminRepo> logger, IHttpContextAccessor httpContextAccessor)
        {
            _configuration = configuration;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _mcCodes = _configuration.GetConnectionString("MachineCodes") ?? "";
            _sendDataToOws = _configuration.GetConnectionString("SendDataToOws") ?? "";
            _getEmployeeDetails = _configuration.GetConnectionString("GetEmployeeDetails") ?? "";
        }

        private IDbConnection Connection => new MySqlConnection(_configuration.GetConnectionString("DefaultConnection"));

        #region 'GetProductionMapList'
        public async Task<List<ProductionMap>> GetProductionMapList(ProductionMap? model)
        {
            try
            {
                using (var connection = Connection)
                {

                    var result = await connection.QueryAsync<ProductionMap>("sp_SelectProdMapLocation",
                        new { p_PlantNo = model.PlantNo }, commandType: CommandType.StoredProcedure);
                    return result.ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving ProductionMap list");
                return new List<ProductionMap>();
            }
        }
        #endregion

        #region 'GetPLantNoList'
        public async Task<List<Plant>> GetPLantNoList()
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "SELECT PLantNo, PlantName FROM plants";
                    var result = await connection.QueryAsync<Plant>(query);
                    return result.ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving Plant Nos list");
                return new List<Plant>();
            }
        }
        #endregion

        #region 'UploadProdMapRepo'
        public async Task<bool> UploadProdMapRepo(ProductionMap model, string uniqueFileName)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "sp_InsertProdMap";
                    var parameters = new
                    {
                        p_ProductionName = model.ProductionMapName,
                        p_ImgName = uniqueFileName,
                        p_PlantNo = model.PlantNo,
                        p_CreatedBy = model.CreatedBy
                    };
                    var result = await connection.ExecuteAsync(query, parameters, commandType: CommandType.StoredProcedure);
                    return result > 0;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving to database.");
                throw; // Let the controller handle the exception
            }
        }
        #endregion

        #region 'CheckProdName'
        public async Task<int> CheckProdName(ProductionMap model)
        {
            try
            {
                using (var connection = Connection)
                {
                    if (model.ProductionMapId == 0 || model.ProductionMapId == null)
                    {
                        var query = "SELECT COUNT(*) FROM productionmaps WHERE productionmapname = @productionmapname";
                        var result = await connection.ExecuteScalarAsync<int>(query, new { model.ProductionMapName });
                        return result;
                    }
                    else
                    {
                        var query = "SELECT COUNT(*) FROM productionmaps WHERE productionmapname = @productionmapname AND ProductionMapId != @ProductionMapId";
                        var result = await connection.ExecuteScalarAsync<int>(query, new { model.ProductionMapName, model.ProductionMapId });
                        return result;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving ProductionMap list");
                throw;
            }
        }
        #endregion

        #region 'DeleteMapData'
        public async Task<bool> DeleteMapData(ProductionMap model)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "sp_DisableProdMap";
                    var parameters = new
                    {
                        p_ProductionMapId = model.ProductionMapId,
                        p_UpdatedBy = model.CreatedBy
                    };
                    var deleteExec = await connection.ExecuteAsync(query, parameters, commandType: CommandType.StoredProcedure);
                    return deleteExec > 0;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting ProductionMap");
                throw;
            }
        }
        #endregion

        #region 'UploadProdMapReplacedImg'
        public async Task<bool> UploadProdMapReplacedImg(ProductionMap model, string uniqueFileName)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "sp_UpdateProdMapImage";
                    var parameters = new
                    {
                        P_ImgName = uniqueFileName,
                        p_ProductionMapId = model.ProductionMapId,
                        p_UpdatedBy = model.CreatedBy
                    };
                    var result = await connection.ExecuteAsync(query, parameters, commandType: CommandType.StoredProcedure);
                    return result > 0;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating.");
                throw; // Let the controller handle the exception
            }
        }
        #endregion

        #region 'UploadProdMapDetails'
        public async Task<bool> UpdateProdMapDetails(ProductionMap model)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "sp_UpdateProdMapDetails";
                    var parameters = new
                    {
                        p_ProductionMapId = model.ProductionMapId,
                        p_ProductionMapName = model.ProductionMapName,
                        p_PlantNo = model.PlantNo,
                        p_UpdatedBy = model.CreatedBy
                    };
                    var result = await connection.ExecuteAsync(query, parameters, commandType: CommandType.StoredProcedure);
                    return result > 0;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating to database.");
                throw; // Let the controller handle the exception
            }
        }
        #endregion

        #region 'SaveMcCoordinatesRepo'
        public async Task<APIResponse<DbResponse>> SaveMcCoordinatesRepo(MachineLocation model)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "sp_InsertUpdateMachineLocationDetails";
                    var parameters = new
                    {
                        p_MachineLocationId = model.MachineLocationId,
                        p_MachineCode = model.MachineCode,
                        p_PlantNo = model.PlantNo,
                        p_ProductionMapId = model.ProductionMapId,
                        p_X = model.X,
                        p_Y = model.Y,
                        p_CreatedBy = model.CreatedBy,
                    };
                    var result = await connection.QueryFirstOrDefaultAsync<DbResponse>(query, parameters, commandType: CommandType.StoredProcedure);
                    return new APIResponse<DbResponse>
                    {
                        Data = result,
                        Message = result?.Message ?? "No message",
                        Success = result?.Success ?? false
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving to database.");
                throw;
            }
        }
        #endregion

        #region 'GetMCLocationRepo'
        public async Task<List<MachineLocation>> GetMCLocationRepo(MachineLocation? model)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = @"  SELECT MachineLocationId, MachineCode, PlantNo, ProductionMapId, X, Y
                                        FROM machinelocations
                                        WHERE PlantNo = @PlantNo and ProductionMapId = @ProductionMapId";
                    var result = await connection.QueryAsync<MachineLocation>(query, new { model.PlantNo, model.ProductionMapId });
                    return result.ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving ProductionMap list");
                return new List<MachineLocation>();
            }
        }
        #endregion

        #region 'DeleteMCLocationRepo'
        public async Task<bool> DeleteMCLocationRepo(MachineLocation model)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "sp_DeleteMachineLocation";
                    var parameters = new
                    {
                        p_MachineLocationId = model.MachineLocationId
                    };
                    var deleteExec = await connection.ExecuteAsync(query, parameters, commandType: CommandType.StoredProcedure);
                    return deleteExec > 0;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting ProductionMap");
                throw;
            }
        }
        #endregion

        #region 'GetMachineCodes using API'
        public async Task<List<Machine>> GetMachineCodes()
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var response = await client.GetAsync(_mcCodes);
                    string result = await response.Content.ReadAsStringAsync();

                    var apiResponse = JsonConvert.DeserializeObject<APIResponse<List<Machine>>>(result);
                    return apiResponse?.Data ?? new List<Machine>();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting machine codes");
                throw;
            }
        }
        #endregion

        #region 'SaveSignal'
        public async Task<APIResponse<DbResponse>> SaveSignal(OwsTicketDetails model)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "sp_InsertUpdateTicket";
                    var parameters = new
                    {
                        p_id = model.id,
                        p_controlno = model.controlno,
                        p_type = model.type,
                        p_plantno = model.plantno,
                        p_process = model.process,
                        p_area = model.area,
                        p_machinecode = model.machinecode,
                        p_mc_error_buyoff_repair_date = model.mc_error_buyoff_repair_date,
                        p_details = model.details,
                        p_requestor = model.requestor,
                        p_me_support = model.me_support,
                        p_errorcode = model.errorcode,
                        p_errorname = model.errorname,
                        p_status = model.status
                    };
                    var result = await connection.QueryFirstOrDefaultAsync<DbResponse>(query, parameters, commandType: CommandType.StoredProcedure);
                    return new APIResponse<DbResponse>
                    {
                        Data = result,
                        Message = result?.Message ?? "No message",
                        Success = result?.Success ?? false
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error!");
                throw;
            }
        }
        #endregion

        #region 'SendDataToOws'
        public async Task<IActionResult?> SendDataToOws(int id, string message)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var data = new
                    {
                        id = id,
                        message = message
                    };

                    var json = JsonConvert.SerializeObject(data);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                    var response = await client.PostAsync(_sendDataToOws, content);
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending data to ows");
                throw;
            }
        }
        #endregion

        #region 'GetMachineStatusRepo'
        public async Task<List<MachineStatusDetails>> GetMachineStatusRepo(MachineStatusDetails? model)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "sp_SelectMachineStatus";
                    var result = await connection.QueryAsync<MachineStatusDetails>(query, new { p_plantno = model.plantno, p_productionmapid = model.productionmapid }, commandType: CommandType.StoredProcedure);
                    return result.ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving ProductionMap list");
                return new List<MachineStatusDetails>();
            }
        }
        #endregion

        #region 'GetPLantNoList'
        public async Task<List<MCStatusColor>> GetMCStatusColorsRepo()
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "SELECT status_id, status_details, status_color, hex_value FROM status";
                    var result = await connection.QueryAsync<MCStatusColor>(query);
                    return result.ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving data.");
                return new List<MCStatusColor>();
            }
        }
        #endregion

        #region 'SaveMachineStatusColorRepo'
        public async Task<APIResponse<DbResponse>> SaveMachineStatusColorRepo(MCStatusColor model)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "sp_UpdateStatusColor";
                    var parameters = new
                    {
                        p_status_id = model.status_id,
                        p_status_color = model.status_color,
                        p_hex_value = model.hex_value,
                        p_user = model.currentuser
                    };
                    var result = await connection.QueryFirstOrDefaultAsync<DbResponse>(query, parameters, commandType: CommandType.StoredProcedure);
                    return new APIResponse<DbResponse>
                    {
                        Data = result,
                        Message = result?.Message ?? "No message",
                        Success = result?.Success ?? false
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving to database.");
                throw;
            }
        }
        #endregion

        #region 'GetEmployeeName'
        [HttpGet]
        public async Task<string?> GetEmployeeName(string requestor)
        {
            using (var client = new HttpClient())
            {
                var content = new StringContent(
                    JsonConvert.SerializeObject(new { employeeNumber = requestor }),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(_getEmployeeDetails, content);
                string json = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(requestor, response.StatusCode);
                    return null;
                }

                var result = JsonConvert.DeserializeObject<APIResponse<EmployeeName>>(json);
                return result?.Data?.employeeName;


            }
        }
        #endregion
    }
}

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


namespace MachineMonitoring.DataAccess.Repository
{
    public class AdminRepo
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AdminRepo> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly string _mcCodes = "";

        public AdminRepo(IConfiguration configuration, ILogger<AdminRepo> logger, IHttpContextAccessor httpContextAccessor)
        {
            _configuration = configuration;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _mcCodes = _configuration.GetConnectionString("MachineCodes") ?? "";
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
                        new {p_PlantNo = model.PlantNo}, commandType: CommandType.StoredProcedure);
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

        #region 'GetMachineRepo'
        public async Task<List<Machine>> GetMachineRepo()
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "SELECT MachineCode, MachineName FROM machines";
                    var result = await connection.QueryAsync<Machine>(query);
                    return result.ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving Machines");
                return new List<Machine>();
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
                    //var query = @"  UPDATE ProductionMaps SET IsDeleted = 1, UpdatedBy = @CreatedBy
                    //                WHERE ProductionMapId = @ProductionMapId";
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
                    //var query = @" UPDATE productionmaps SET ImgName = @ImgName, UpdatedBy = @UpdatedBy
                    //                WHERE ProductionMapId = @ProductionMapId";
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
                    //var query = @" UPDATE productionmaps SET 
                    //                    ProductionMapName = @ProductionMapName,
                    //                    PlantNo = @PlantNo,
                    //                    UpdatedBy = @UpdatedBy
                    //               WHERE ProductionMapId = @ProductionMapId";
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
                throw; // Let the controller handle the exception
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
                    //var query = "DELETE FROM MachineLocations WHERE MachineLocationId = @MachineLocationId";
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

    }
}

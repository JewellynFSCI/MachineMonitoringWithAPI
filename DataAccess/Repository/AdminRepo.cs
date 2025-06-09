using System.Data;
using MachineMonitoring.Models;
using MySql.Data.MySqlClient;
using Dapper;
using MachineMonitoring.Models.ViewModel;
using Microsoft.AspNetCore.Mvc;


namespace MachineMonitoring.DataAccess.Repository
{
    public class AdminRepo
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AdminRepo> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        
        public AdminRepo(IConfiguration configuration, ILogger<AdminRepo> logger, IHttpContextAccessor httpContextAccessor)
        {
            _configuration = configuration;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        private IDbConnection Connection => new MySqlConnection(_configuration.GetConnectionString("DefaultConnection"));

        #region 'GetProductionMapList'
        public async Task<List<ProductionMap>> GetProductionMapList(ProductionMap? model)
        {
            try
            {
                if (model.PlantNo == 0) {
                    using (var connection = Connection)
                    {
                        var query = @"  SELECT ProductionMapId, ProductionMapName, ImgName, PlantName, PlantNo 
                                        FROM vewprodmaplocation
                                        WHERE IsDeleted = 0";
                        var result = await connection.QueryAsync<ProductionMap>(query);
                        return result.ToList();
                    }
                }
                else
                {
                    using (var connection = Connection)
                    {
                        var query = @"  SELECT ProductionMapId, ProductionMapName, ImgName, PlantName,PlantNo 
                                    FROM vewprodmaplocation
                                    WHERE PlantNo = @PlantNo AND IsDeleted = 0";
                        var result = await connection.QueryAsync<ProductionMap>(query, new {model.PlantNo});
                        return result.ToList();
                    }
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
                _logger.LogError(ex, "Error retrieving Plant Nos list");
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
                    var query = @"  INSERT INTO ProductionMaps 
                                    (ProductionMapName, ImgName, PlantNo, CreatedBy) 
                                    VALUES (@ProductionName, @ImgName, @PlantNo, @CreatedBy)";

                    var parameters = new
                    {
                        ProductionName = model.ProductionMapName,
                        ImgName = uniqueFileName,
                        PlantNo = model.PlantNo,
                        CreatedBy = "ApplicationUser"
                    };

                    var result = await connection.ExecuteAsync(query, parameters);

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
                        var result = await connection.ExecuteScalarAsync<int>(query, new { model.ProductionMapName, model.ProductionMapId});
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
                    //var query = "DELETE FROM ProductionMaps WHERE ProductionMapId = @ProductionMapId";
                    var query = @"  UPDATE ProductionMaps SET IsDeleted = 1, UpdatedBy = 'Emp Name Session'
                                    WHERE ProductionMapId = @ProductionMapId";
                    var deleteExec = await connection.ExecuteAsync(query, new { model.ProductionMapId });
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

        #region 'UploadProdMapRepo'
        public async Task<bool> UploadProdMapReplacedImg(ProductionMap model, string uniqueFileName)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = @" UPDATE productionmaps SET ImgName = @ImgName, UpdatedBy = @UpdatedBy
                                    WHERE ProductionMapId = @ProductionMapId";
                    var parameters = new
                    {
                        ImgName = uniqueFileName,
                        model.ProductionMapId,
                        UpdatedBy = "Emp Name session"
                    };
                    var result = await connection.ExecuteAsync(query, parameters);
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

        #region 'UploadProdMapDetails'
        public async Task<bool> UpdateProdMapDetails(ProductionMap model)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = @" UPDATE productionmaps SET 
                                        ProductionMapName = @ProductionMapName,
                                        PlantNo = @PlantNo,
                                        UpdatedBy = @UpdatedBy
                                   WHERE ProductionMapId = @ProductionMapId";
                    var parameters = new
                    {
                        model.ProductionMapId,
                        model.ProductionMapName,
                        model.PlantNo,
                        UpdatedBy = "Emp Name session"
                    };
                    var result = await connection.ExecuteAsync(query, parameters);
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
        public async Task<bool> SaveMcCoordinatesRepo(MachineLocation model)
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = @"  INSERT INTO machinelocations 
                                    (MachineCode, PlantNo, ProductionMapId, X, Y, CreatedBy) 
                                    VALUES (@MachineCode, @PlantNo, @ProductionMapId, X, Y, @CreatedBy)";

                    var parameters = new
                    {
                        MachineCode = model.MachineCode,
                        PlantNo = model.PlantNo,
                        ProductionMapId = model.ProductionMapId,
                        X = model.X,
                        Y = model.Y,
                        CreatedBy = "System"
                    };

                    var result = await connection.ExecuteAsync(query, parameters);

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

    }
}
